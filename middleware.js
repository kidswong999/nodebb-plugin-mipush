module.exports = function(middleware) {
	var	Middleware = {},
		mipush = require('./library');

	Middleware.hasConfig = function(req, res, next) {
		if (mipush.config) next();
		else res.status(404);
	};

	Middleware.hasCode = function(req, res, next) {
		if (req.query && req.query.code) {
			next();
		} else if (req.query.hasOwnProperty('error') && req.query.error === 'access_denied') {
			res.redirect('mipush/settings');
		} else {
			middleware.buildHeader(req, res, function() {
				res.render('500', {
					message: req.query.error
				});
			});
		}
	};

	Middleware.isLoggedIn = function(req, res, next) {
		if (req.user && parseInt(req.user.uid, 10) > 0)
			next();
		else
			res.redirect(403);
	};

	Middleware.setupRequired = function(req, res, next) {
		if (!req.user) {
			res.locals.setupRequired = false;
			return next();
		}
		mipush.isUserAssociated(req.user.uid, function(err, assoc) {
			if (err) {
				return next(err);
			}
			res.locals.setupRequired = !assoc;
			next();
		});
	};

    Middleware.addDevice = function(req, res, next) {
    	if(!req.body || !req.body.phone || !req.body.regid || !req.user){
			return res.status(400).json('Invalid request:'+" body: "+ JSON.stringify(req.body) + " phone:" + req.body.phone + " regid:" + req.body.regid  + " user:" + JSON.stringify(req.user));
		}

		mipush.saveDevice(req.user.uid, req.body.phone, req.body.regid,  function(err){
			if(err){
				return res.status(400).json(err);
			}
            next();
		});

    };

	return Middleware;
};
