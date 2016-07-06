const ParentBot = require('./_Bot.js');
const util = require('util');
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
  passport.use(new FacebookStrategy({
      clientID: config.facebook.id,
      clientSecret: config.facebook.secret,
      callbackURL: "/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      if(!profile) { done(null, false); return; }

      var user = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        profile: profile
      };
      self.getUserID(user, done);
    }
  ));
  passport.use(new FacebookTokenStrategy({
      clientID: config.facebook.id,
      clientSecret: config.facebook.secret
    },
    function(accessToken, refreshToken, profile, done) {
      if(!profile) { done(null, false); return; }

      var user = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        profile: profile
      };
      self.getUserID(user, done);
    }
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
    self.getToken(user, function (e, d) {
      console.log(e, d);
      res.result.setMessage(user);
      next();
    });
  })(req, res, next);
};
Bot.prototype.facebook_token = function (req, res, next) {
  var self = this;
  req.query.access_token = req.query.access_token || req.params.access_token;
  passport.authenticate('facebook-token', function (err, user, info) {
    self.getToken(user, function (e, d) {
      console.log(e, d);
      res.result.setMessage(user);
      next();
    });
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
