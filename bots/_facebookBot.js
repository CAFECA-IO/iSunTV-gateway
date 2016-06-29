const express = require('express');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const FacebookTokenStrategy = require('passport-facebook-token');


FACEBOOK_APP_ID = '247935812254565';
FACEBOOK_APP_SECRET = '8bb4a54d022dd3d7655324b1eeedf16b';

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://swarm.tw/auth/facebook/callback"
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

var app = express();
app.use('/auth/facebook', passport.initialize());
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));
app.get('/auth/facebook/token', passport.authenticate('facebook-token'), function (req, res) { res.send('Yo') });
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));

app.listen(80);
