const ParentBot = require('./_Bot.js');
const util = require('util');
const url = require('url');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const FacebookTokenStrategy = require('passport-facebook-token');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
  var self = this;
  Bot.super_.prototype.init.call(this, config);
  var facebookProcess = function (accessToken, refreshToken, profile, done) {
    if(!profile) { done(null, false); return; }
    var user = {
      type: 'facebook',
      accessToken: accessToken,
      refreshToken: refreshToken,
      condition: {
        'facebook.id': profile.id
      },
      profile: {
        username: profile.displayName,
        email: profile.emails[0].value,
        emails: profile.emails.map(function (v) { return v.value; }),
        photo: profile.photos[0].value,
        photos: profile.photos.map(function (v) { return v.value; }),
				allowmail: true,
        facebook: {
          id: profile.id,
          username: profile.displayName,
          emails: profile.emails,
          photos: profile.photos,
        }
      }
    };
    self.getUserID(user, done);
  }

  passport.use(new FacebookStrategy({
      clientID: config.facebook.id,
      clientSecret: config.facebook.secret,
      callbackURL: "/auth/facebook/callback",
      profileFields: ['id', 'displayName', 'photos', 'email']
    },
    facebookProcess
  ));
  passport.use(new FacebookTokenStrategy({
      clientID: config.facebook.id,
      clientSecret: config.facebook.secret,
      profileFields: ['id', 'displayName', 'photos', 'email']
    },
    facebookProcess
  ));
  passport.serializeUser(function(user, done) {
      done(null, user);
  });

  passport.deserializeUser(function(user, done) {
      done(null, user);
  });

};

Bot.prototype.start = function () {

};

Bot.prototype.initialize = function (req, res, next) {
  passport.initialize()(req, res, next);
};
Bot.prototype.facebook_authenticate = function (req, res, next) {
  passport.authenticate('facebook', { scope: ['public_profile', 'email'] })(req, res, next);
};
Bot.prototype.facebook_callback = function (req, res, next) {
  var self = this;
  passport.authenticate('facebook', function (err, user, info) {
    if(!user) {
      // auth failed
    	var e = new Error('Facebook authorization failed');
    	e.code = '68101';
    	res.result.setErrorCode(e.code);
    	res.result.setMessage(e.message);

			if(self.config.facebook.redirect) {
				var redirectURL, tmp = url.parse(self.config.facebook.redirect);
				tmp.query = {
					result: 0,
					errorcode: e.code,
					message: e.message
				};
				res.result.setResult(302);
				res.result.setData({Location: url.format(tmp)});
			}

      next();
    }
    else {
      self.getToken(user, function (e, d) {
        if(e) {
        	res.result.setErrorCode(e.code);
        	res.result.setMessage(e.message);
        }
        else if(!d) {
          var e = new Error('Facebook authorization failed');
          e.code = '68101';
          res.result.setErrorCode(e.code);
          res.result.setMessage(e.message);
        }
        else {
          res.result.setResult(1);
          res.result.setMessage('Login with Facebook');
          res.result.setData(d);
          res.result.setSession({uid: d.uid});
        }

				if(self.config.facebook.redirect) {
					var redirectURL, tmp = url.parse(self.config.facebook.redirect);
					tmp.query = res.result.toJSON();
					tmp.query.data = JSON.stringify(tmp.query.data);
					res.result.setResult(302);
					res.result.setData({Location: url.format(tmp)});
				}

        next();
      });
    }
  })(req, res, next);
};
Bot.prototype.facebook_token = function (req, res, next) {
  var self = this;
  req.query.access_token = req.query.access_token || req.params.access_token;
  passport.authenticate('facebook-token', function (err, user, info) {
    if(!user) {
      // auth failed
      var e = new Error('Facebook authorization failed');
      e.code = '68101';
      res.result.setErrorCode(e.code);
      res.result.setMessage(e.message);
      next();
    }
    else {
      self.getToken(user, function (e, d) {
        if(e) {
          res.result.setErrorCode(e.code);
          res.result.setMessage(e.message);
        }
        else if(!d) {
          var e = new Error('Facebook authorization failed');
          e.code = '68101';
          res.result.setErrorCode(e.code);
          res.result.setMessage(e.message);
        }
        else {
          res.result.setResult(1);
          res.result.setMessage('Login with Facebook');
          res.result.setData(d);
          res.setSession({uid: d.uid});
        }
        next();
      });
    }
  })(req, res, next);
};
Bot.prototype.getUserID = function (user, cb) {
  var bot = this.getBot('User');
  bot.getUserBy3rdParty(user, cb);
};
Bot.prototype.getToken = function (user, cb) {
  var bot = this.getBot('User');
  bot.createToken(user, cb);
};

module.exports = Bot;
