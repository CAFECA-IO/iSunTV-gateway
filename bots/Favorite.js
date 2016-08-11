// Favorite APIs (Business logic)
const util = require('util');

const mongodb = require('mongodb');
const dvalue = require('dvalue');

const ParentBot = require('./_Bot.js');


var logger;


var formatFavorite = function (favorite) {
	favorite = dvalue.default(favorite, {
		uid: ""
		pid: "",
		ctime: new Date().getTime(),
	});
	return favorite;
};

/************************************************
*                                               *
*               Declare Bot                     *
*                                               *
************************************************/
var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);
	logger = config.logger;
};

Bot.prototype.start = function () {

};

/************************************************
*                                               *
*        Favorite APIs                          *
*                                               *
************************************************/
// AddFavorite
// require: options.uid, options.pid */
Bot.prototype.AddFavorite = function (options, cb) {
	var self = this;

	// Check user
	var collection = self.db.collection('Users');
	var cond = { _id: new mongodb.ObjectID(options.uid), enable: true };
	collection.findOne(cond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!user) { e = new Error('User not found'); e.code = '39102'; return cb(e); }
		else {
			// Update Favorites
			var criteria = { uid: options.uid };
			var update = { $set: formatFavorite(options) }
			self.db.collection('Favorites').update(criteria, update, { upsert: true }, function(err, result){
				if(e) { e.code = '01002'; return cb(e); }
				cb(null, {});
			};
		}
	});
};

module.exports = Bot;
