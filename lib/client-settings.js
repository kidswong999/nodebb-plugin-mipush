"use strict";
/* globals define, socket, app */

define('forum/mipush/settings', ['vendor/jquery/serializeObject/jquery.ba-serializeobject.min'], function() {
	var Settings = {};

	Settings.init = function() {
		socket.emit('plugins.mipush.settings.load', function(err, settings) {
			var	defaults = {
					'mipush:enabled': 1
				};

			for(var key in defaults) {
				if (defaults.hasOwnProperty(key)) {
					if (settings[key] === null) {
						settings[key] = defaults[key];
					}
				}
			}

			// Load settings
			$('.mipush-settings #enabled').prop('checked', parseInt(settings['mipush:enabled'], 10) === 1);
			$('.mipush-settings #target').val(settings['mipush:target']);
		});

		$('#save').on('click', function() {
			var settings = $('.mipush-settings').serializeObject();
			settings['mipush:enabled'] = settings['mipush:enabled'] === 'on' ? 1 : 0;

			socket.emit('plugins.mipush.settings.save', settings, function(err) {
				if (!err) {
					app.alertSuccess('[[user:profile_update_success]]');
				} else {
					app.alertError(err.message || '[[error:invalid-data]]');
				}
			});
		});

		$('#test').on('click', function() {
			socket.emit('plugins.mipush.test', function(err) {
				if (!err) { app.alertSuccess('Test notification sent'); }
				else { app.alertError(err.message); }
			});
		});

		$('#disassociate').on('click', Settings.disassociate);
	};

	Settings.disassociate = function() {
		socket.emit('plugins.mipush.disassociate', {}, function(err) {
			if (!err) {
				window.location.reload();
			} else {
				app.alertError(err.message || '[[error:invalid-data]]');
			}
		});
	};

	return Settings;
});