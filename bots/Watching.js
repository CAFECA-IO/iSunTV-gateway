// Watching APIs (Business logic)
const util = require('util');

const mongodb = require('mongodb');
const dvalue = require('dvalue');

const ParentBot = require('./_Bot.js');


var logger;


var formatWatching = function (watching) {
	watching = dvalue.default(watching, {
		uid: "",
		pid: "",
		record: "",
		timing: "",
		atime: new Date().getTime(),
	});
	return watching;
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
*        Watching APIs                          *
*                                               *
************************************************/
// recordWatchingProgram
// require: uid, pid, record, timing
Bot.prototype.recordWatchingProgram = function (options, cb) {
	var self = this;

	// Check user
	var collection = self.db.collection('Users');
	var cond = { _id: new mongodb.ObjectID(options.uid), enable: true };
	collection.findOne(cond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!user) { e = new Error('User not found'); e.code = '39102'; return cb(e); }
		else {
			// Update Watching_programs
			var criteria = { uid: options.uid, pid: options.pid };
			var update = { $set: formatFavorite(options) };
			var updatedOptions = { upsert: true };
			var collection = self.db.collection('Watching_programs');
			collection.updateOne(criteria, update, updatedOptions, function(err, result){
				if(e) { e.code = '01002'; return cb(e); }
				cb(null, {});
			});
		}
	});
};

// listWatchingPrograms
// require: options.uid */
Bot.prototype.listWatchingPrograms = function (options, cb) {
	var self = this;

	//list Watching_programs
	var collection = self.db.collection('Watching_programs');
	var query = { uid: options.uid };
	var sort = [['atime', -1]];
	collection.find(query).sort(sort).toArray(function (e, favorites) {
		if(e) { e.code = '01002'; return cb(e); }

		// find programs
		var pids = favorites.map(function(favorite){ return favorite.pid });
		var collection = self.db.collection('Programs');
		var query = { pid: { $in : pids }};
		collection.find(query).toArray(function(e, programs){
			// merge data
			cb(null, favorites.map(function(favorite){
				var program = dvalue.search(programs, { pid : favorite.pid });
				return dvalue.default(favorite, program);
			}));
		});

	});
};

module.exports = Bot;
