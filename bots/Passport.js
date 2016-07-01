const ParentBot = require('./_Bot.js');
const util = require('util');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const FacebookTokenStrategy = require('passport-facebook-token');

FACEBOOK_APP_ID = '247935812254565';
FACEBOOK_APP_SECRET = '8bb4a54d022dd3d7655324b1eeedf16b';

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
  Bot.super_.prototype.init.call(this, config);
  passport.use(new FacebookStrategy({
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      callbackURL: "/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      console.log('--- facebook Token ---')
      console.log(accessToken);
      console.log(refreshToken);
      console.log(profile);

      done(null, profile.id);
    }
  ));
  passport.use(new FacebookTokenStrategy({
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET
    },
    function(accessToken, refreshToken, profile, done) {
      console.log('--- facebook Token ---')
      console.log(accessToken);
      console.log(refreshToken);
      console.log(profile);

      done(null, profile.id);
    }
  ));
  passport.serializeUser(function(user, done) {
  console.log('--- serialize ---');
  console.log(user);
      done(null, user);
  });

  passport.deserializeUser(function(user, done) {
  console.log('--- deserialize ---');
  console.log(user);
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
  passport.authenticate('facebook')(req, res, next);
};
Bot.prototype.facebook_token = function (req, res, next) {
  passport.authenticate('facebook-token')(req, res, next);
};

module.exports = Bot;
