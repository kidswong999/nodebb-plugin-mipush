"use strict";

var db = module.parent.require('./database'),
	meta = module.parent.require('./meta'),
	user = module.parent.require('./user'),
	posts = module.parent.require('./posts'),
	topics = module.parent.require('./topics'),
	translator = module.parent.require('../public/src/modules/translator'),
	SocketPlugins = module.parent.require('./socket.io/plugins'),
	globalMiddleware = module.parent.require('./middleware'),

	winston = module.parent.require('winston'),
	nconf = module.parent.require('nconf'),
	async = module.parent.require('async'),
	request = module.parent.require('request'),
	S = module.parent.require('string'),
	querystring = require('querystring'),
	path = require('path'),
	cache = require('lru-cache'),
	url = require('url'),

	constants = Object.freeze({
		authorize_url: 'https://api.xmpush.xiaomi.com/authorize',
		push_url: 'https://api.xmpush.xiaomi.com/v2/message/regid'
	}),

	mipush = {};

mipush.init = function (data, callback) {
	var pluginMiddleware = require('./middleware')(data.middleware),
		pluginControllers = require('./controllers');

	// Admin setup routes
	data.router.get('/admin/plugins/mipush', data.middleware.admin.buildHeader, pluginControllers.renderACP);
	data.router.get('/api/admin/plugins/mipush', pluginControllers.renderACP);

	// User routes
	data.router.get('/mipush/settings', pluginMiddleware.hasConfig, globalMiddleware.authenticate, pluginMiddleware.setupRequired, data.middleware.buildHeader, pluginControllers.renderSettings);
	data.router.get('/api/me/mipush/devices', globalMiddleware.authenticate, pluginMiddleware.isLoggedIn, pluginControllers.getDevices);
	data.router.post('/api/me/mipush/devices', globalMiddleware.authenticate, pluginMiddleware.isLoggedIn, pluginMiddleware.addDevice, pluginControllers.getDevices);

	// Config set-up
	db.getObject('settings:mipush', function (err, config) {
		if (!err && config) {
			mipush.config = config;
		} else {
			winston.info('[plugins/mipush] Please complete setup at `/admin/mipush`');
		}
	});

	// WebSocket listeners
	SocketPlugins.mipush = {
		settings: {
			save: mipush.settings.save,
			load: mipush.settings.load
		},
		disassociate: mipush.disassociate,
		test: mipush.test
	};

	callback();
};

mipush.redirectSetup = function (req, res) {
	var qs = querystring.stringify({
		client_id: mipush.config.id,
		redirect_uri: url.resolve(nconf.get('url'), '/mipush/auth'),
		response_type: 'code'
	});

	if (process.env.NODE_ENV === 'development') {
		winston.info('[plugins/mipush] New association, redirecting user to: ' + constants.authorize_url + '?' + qs);
	}

	res.redirect(constants.authorize_url + '?' + qs);
};

mipush.completeSetup = function (req, res, next) {
	async.waterfall([
		function (next) {
			mipush.retrieveToken(req.query.code, next);
		},
		function (token, next) {
			mipush.saveToken(req.user.uid, token, next);
		}
	], next);
};

mipush.disassociate = function (socket, data, callback) {
	if (socket.uid) {
		db.deleteObjectField('users:mipush:devices', socket.uid, callback);
	} else {
		callback(new Error('[[error:not-logged-in]]'));
	}
};

mipush.test = function (socket, data, callback) {
	if (socket.uid) {
		mipush.push({
			notification: {
				path: nconf.get('relative_path') + '/',
				bodyShort: 'Test Notification',
				bodyLong: 'If you have received this, then mipush is now working!'
			},
			uids: [socket.uid]
		});
		callback();
	} else {
		callback(new Error('[[error:not-logged-in]]'));
	}
};

mipush.push = function (data) {
	var notifObj = data.notification;
	var uids = data.uids;

	if (!Array.isArray(uids) || !uids.length || !notifObj) {
		return;
	}

	var settingsKeys = uids.map(function (uid) {
		return 'user:' + uid + ':settings';
	});

	async.parallel({
		devices: async.apply(db.getObjectFields, 'users:mipush:devices', uids),
		settings: async.apply(db.getObjectsFields, settingsKeys, ['mipush:enabled', 'topicPostSort', 'language']),
		package_name: async.apply(db.getObjectField, 'settings:mipush', 'package-name'),
		ios_appsecret: async.apply(db.getObjectField, 'settings:mipush', 'ios-appsecret'),
		android_appsecret: async.apply(db.getObjectField, 'settings:mipush', 'android-appsecret'),
	}, function (err, results) {
		if (err) {
			return winston.error(err.stack);
		}

		if (results.hasOwnProperty('devices')) {
			uids.forEach(function (uid, index) {
				if (!results.devices[uid] || !results.settings[index]) {
					return;
				}
				if (results.settings[index]['mipush:enabled'] === null || parseInt(results.settings[index]['mipush:enabled'], 10) === 1) {
					pushToUid(uid, notifObj, JSON.parse(results.devices[uid]), results.settings[index], results.package_name, results.ios_appsecret, results.android_appsecret);
				}
			});
		}
	});
};

function pushToUid(uid, notifObj, devices, settings, package_name, ios_appsecret, android_appsecret) {
	if (!devices) {
		return;
	}

	if (notifObj.hasOwnProperty('path')) {
		var urlObj = url.parse(notifObj.path, false, true);
		if (!urlObj.host && !urlObj.hostname) {
			// This is a relative path
			notifObj.path = url.resolve(nconf.get('url') + '/', notifObj.path);
		}
	}

	async.waterfall([
		function (next) {
			var language = settings.language || meta.config.defaultLang || 'en-GB',
				topicPostSort = settings.topicPostSort || meta.config.topicPostSort || 'oldest_to_newest';

			notifObj.bodyLong = notifObj.bodyLong || '';
			notifObj.bodyLong = S(notifObj.bodyLong).unescapeHTML().stripTags().unescapeHTML().s;
			async.parallel({
				title: async.apply(topics.getTopicFieldByPid, 'title', notifObj.pid),
				text: function (next) {
					translator.translate(notifObj.bodyShort, language, function (translated) {
						next(undefined, S(translated).stripTags().s);
					});
				},
				postIndex: function (next) {
					posts.getPostField(notifObj.pid, 'tid', function (err, tid) {
						if (err) {
							return next(err);
						}
						posts.getPidIndex(notifObj.pid, tid, topicPostSort, next);
					});
				},
				topicSlug: async.apply(topics.getTopicFieldByPid, 'slug', notifObj.pid)
			}, next);
		},
		function (data, next) {
			var iOSDevices = ""
			var AndroidDevices = ""
			winston.verbose('[plugins/mipush] devices ' + devices);
			for (var i in devices) {
				winston.verbose('[plugins/mipush/loop] devices[i].phone ' + devices[i].phone);
				winston.verbose('[plugins/mipush/loop] devices[i].regid ' + devices[i].regid);
				if (devices[i].phone == "iOS") {
					iOSDevices += (devices[i].regid + ",")
				}
				if (devices[i].phone == "Android") {
					AndroidDevices += (devices[i].regid + ",")
				}
			}
			winston.verbose('[plugins/mipush] iOSDevices ' + iOSDevices);
			winston.verbose('[plugins/mipush] AndroidDevices ' + AndroidDevices);
			winston.verbose('[plugins/mipush] Sending push notification to uid ' + uid);

			if (iOSDevices.length > 0) {
				winston.verbose('[plugins/mipush] Sending push notification to iOS ' + iOSDevices);
				var data_ios = {
					restricted_package_name: package_name,
					pass_throughpass_through: 0,
					notify_type: 1,
					registration_id: iOSDevices,
					title: data.title ? data.title : "",
					description: data.text,
					payload: notifObj.path || nconf.get('url') + '/topic/' + data.topicSlug + '/' + data.postIndex,
					"extra.sound_url": "defult",
				}
				winston.verbose('[plugins/mipush] data_ios ' + data_ios);
				request({
					url: constants.push_url,
					method: 'POST',
					formData: data_ios,
					headers: {
						'Authorization': 'key=' + ios_appsecret
					},
				}, function (error, response, body) {
					if (!error && response.statusCode == 200 && body.result == "ok") {
						winston.verbose('[plugins/mipush] ' + error);
						winston.verbose('[plugins/mipush] ' + response);
						winston.verbose('[plugins/mipush] ' + body);

					} else {
						winston.error('[plugins/mipush] ' + error);
						winston.error('[plugins/mipush] ' + response);
						winston.error('[plugins/mipush] ' + body);
					}
				});

			}
			if (AndroidDevices.length > 0) {
				winston.verbose('[plugins/mipush] Sending push notification to Android ' + AndroidDevices);
				var data_android = {
					restricted_package_name: package_name,
					pass_throughpass_through: 0,
					notify_type: 1,
					registration_id: AndroidDevices,
					title: data.title ? data.title : "",
					description: data.text,
					payload: notifObj.path || nconf.get('url') + '/topic/' + data.topicSlug + '/' + data.postIndex,
					"extra.sound_url": "defult",
				}
				request({
					url: constants.push_url,
					method: 'POST',
					formData: data_android,
					headers: {
						'Authorization': 'key=' + android_appsecret
					}
				}, function (error, response, body) {
					if (!error && response.statusCode == 200 && body.result == "ok") {
						winston.verbose('[plugins/mipush] ' + error);
						winston.verbose('[plugins/mipush] ' + response);
						winston.verbose('[plugins/mipush] ' + body);
					} else {
						winston.error('[plugins/mipush] ' + error);
						winston.error('[plugins/mipush] ' + response);
						winston.error('[plugins/mipush] ' + body);
					}
				});
			}
		}
	]);
}

mipush.addMenuItem = function (custom_header, callback) {
	custom_header.plugins.push({
		"route": '/plugins/mipush',
		"icon": 'fa-mobile',
		"name": 'mipush'
	});

	callback(null, custom_header);
};

mipush.addProfileItem = function (data, callback) {
	if (mipush.config) {
		data.links.push({
			id: 'mipush',
			route: '../../mipush/settings',
			icon: 'fa-mobile',
			name: 'mipush',
			visibility: false
		});
	}

	callback(null, data);
};

mipush.saveDevice = function (uid, phone, regid, callback) {

	async.waterfall([
		function (next) {
			db.isObjectField('users:mipush:devices', uid, next);
		},
		function (exists, next) {
			if (exists) {
				mipush.getDevices(uid, next);
			} else {
				next(null, JSON.stringify([]));
			}
		},
		function (devicesData, next) {
			var devices = JSON.parse(devicesData);
			var addFlag = true
			for(var i in devices){
				if(devices[i].phone == phone && devices[i].regid == regid){
					addFlag = false
				}
			}
			if(addFlag){
				devices.push({ phone: phone, regid: regid });
			}else{
				winston.verbose('[plugins/mipush] device is already added, no need to add: ' + devicesData);
			}

			db.setObjectField('users:mipush:devices', uid, JSON.stringify(Array.from(devices)), next);
		}],
		callback);
};

mipush.getDevices = function (uid, callback) {
	db.getObjectField('users:mipush:devices', uid, callback);
};

mipush.getUserDevices = function (uid, callback) {
	async.parallel({
		devices: async.apply(db.getObjectField, 'users:mipush:devices', uid)
	}, function (err, results) {
		if (results.devices) {
			callback(null, JSON.parse(results.devices));
		} else {
			callback(null, []);
		}
	});
};

mipush.isUserAssociated = function (uid, callback) {
	db.isObjectField('users:mipush:devices', uid, callback);
};

mipush.getAssociatedUsers = function (callback) {
	db.getObjectKeys('users:mipush:devices', function (err, uids) {
		if (!err) {
			user.getUsersFields(uids, ['username', 'picture'], callback);
		} else {
			callback(err);
		}
	});
};

/* Settings */
mipush.settings = {};

mipush.settings.save = function (socket, data, callback) {
	if (socket.hasOwnProperty('uid') && socket.uid > 0) {
		db.setObject('user:' + socket.uid + ':settings', data, callback);
	} else {
		callback(new Error('not-logged-in'));
	}
};

mipush.settings.load = function (socket, data, callback) {
	if (socket.hasOwnProperty('uid') && socket.uid > 0) {
		db.getObjectFields('user:' + socket.uid + ':settings', ['mipush:enabled', 'mipush:target'], callback);
	} else {
		callback(new Error('not-logged-in'));
	}
};

module.exports = mipush;
