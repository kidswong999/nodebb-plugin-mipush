var mipush = require('./library'),
	meta = module.parent.parent.require('./meta'),
	nconf = module.parent.parent.require('nconf'),

	Controllers = {};

Controllers.renderACP = function(req, res) {
	mipush.getAssociatedUsers(function(err, users) {
		res.render('admin/plugins/mipush', {
			users: users,
			numAssoc: users.length,
			base_url: nconf.get('url').replace(/\/+$/, '')
		});
	});
};

Controllers.renderAuthSuccess = function(req, res) {
	res.render('mipush/assocSuccess');
};

Controllers.renderSettings = function(req, res) {
	mipush.getUserDevices(req.user.uid, function(err, devices) {
		res.render('mipush/settings', {
			"site_title": meta.config.title || meta.config.browserTitle || 'NodeBB',
			"setupRequired": res.locals.setupRequired,
			"devices": devices
		});
	});
};

Controllers.getDevices = function(req,res){
    mipush.getDevices(req.user.uid, function(err, devices) {
    	if(!err) {
    		res.json(JSON.parse(devices)||[]);
        }else{
    		res.status(500).json(err);
		}
    });
}

module.exports = Controllers;