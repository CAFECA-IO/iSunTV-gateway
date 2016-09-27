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
		timing: 0,
		is_finished: false,
		atime: new Date().getTime()
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
// require: uid, pid, record, timing, is_finished
Bot.prototype.recordWatchingProgram = function (options, cb) {
	var self = this;
	options.is_finished = !!options.is_finished;

	// Check user
	var collection = self.db.collection('Programs');
	var cond = { pid: options.pid };
	collection.findOne(cond, {}, function (e, program) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!program) { e = new Error('Program not found'); e.code = '39201'; return cb(e); }
		else {
			// Update Watching_programs
			var criteria = { uid: options.uid, pid: options.pid };
			var update = { $set: formatWatching(options) };
			var updatedOptions = { upsert: true };
			var collection = self.db.collection('Watching_programs');
			collection.updateOne(criteria, update, updatedOptions, function(err, result){
				if(e) { e.code = '01002'; return cb(e); }
				cb(null, {});
			});
		}
	});
};

// listWatchedHistory
// require: options.uid */
Bot.prototype.listWatchedHistory = function (options, cb) {
	//list Watching_programs
	var query = { uid: options.uid };

	var pageOpt = Number(options.page);
	var limitOpt = Number(options.limit);
	var skip = pageOpt ? (pageOpt - 1) * limit : 0;
	var limit = limitOpt ? limitOpt : 0;
	this._listWatchedProgram(query, skip, limit, cb);
};

// listWatchedHistory
// require: options.uid */
Bot.prototype.listContinueWatching = function (options, cb) {
	//list Watching_programs
	var query = { uid: options.uid, is_finished: false };

	var pageOpt = Number(options.page);
	var limitOpt = Number(options.limit);
	var skip = pageOpt ? (pageOpt - 1) * limit : 0;
	var limit = limitOpt ? limitOpt : 0;
	this._listWatchedProgram(query, skip, limit, cb);
};

/**
 * util
 */
Bot.prototype._listWatchedProgram = function (query, skip, limit, cb) {
	var self = this;
	var collection = self.db.collection('Watching_programs');
	var sort = [['atime', -1]];
	collection.find(query).skip(skip).limit(limit).sort(sort).toArray(function (e, watchingPrograms) {
		if(e) { e.code = '01002'; return cb(e); }
		// merge programs
		var pids = watchingPrograms.map(function(program){ return program.pid });
		self.getBot('ResourceAgent').mergeByPrograms({ pids: pids }, function(err, programs) {
			cb(null, watchingPrograms.map(function (watchingProgram){
				var program = dvalue.search(programs, { pid : watchingProgram.pid });
				if(program) { return undefined; }
				else { return dvalue.default(program, watchingProgram); }
			}).filter(function (v) { return v != undefined; }))
		});
	});
}


module.exports = Bot;
