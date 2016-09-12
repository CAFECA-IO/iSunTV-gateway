// Favorite APIs (Business logic)
const util = require('util');

const mongodb = require('mongodb');
const dvalue = require('dvalue');

const ParentBot = require('./_Bot.js');


var logger;


var formatFavorite = function (favorite) {
	favorite = dvalue.default(favorite, {
		uid: "",
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
// addFavorite
// require: options.uid, options.pid */
Bot.prototype.addFavorite = function (options, cb) {
	var self = this;

	// Check Program
	var collection = self.db.collection('Programs');
	var cond = { pid: options.pid };
	collection.findOne(cond, {}, function (e, program) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!program) { e = new Error('Program not found'); e.code = '39201'; return cb(e); }
		else {
			// Update Favorites
			var criteria = { uid: options.uid, pid: options.pid };
			var update = { $set: formatFavorite(options) };
			var updatedOptions = { upsert: true };
			self.db.collection('Favorites').updateOne(criteria, update, updatedOptions, function(err, result){
				if(e) { e.code = '01002'; return cb(e); }
				cb(null, {});
			});
		}
	});
};

// removeFavorite
// require: options.uid, options.pid */
Bot.prototype.removeFavorite = function (options, cb) {
	var self = this;

	// Check user
	var collection = self.db.collection('Users');
	var cond = { _id: new mongodb.ObjectID(options.uid), enable: true };
	collection.findOne(cond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!user) { e = new Error('User not found'); e.code = '39102'; return cb(e); }
		else {
			// Delete Favorite
			var collection = self.db.collection('Favorites');
			var cond = options;
			collection.deleteOne(cond, function (e, result) {
				if(e) { e.code = '01002'; return cb(e); }
				if(result.deletedCount === 0){ e = new Error('Favorite not found'); e.code = '39601'; return cb(e); }
				cb(null, {});
			});
		}
	});
};

// listFavorite
// require: options.uid */
Bot.prototype.listFavorite = function (options, cb) {
	var self = this;

	// list Favorite
	var collection = self.db.collection('Favorites');
	var query = { uid: options.uid };
	var sort = [['ctime', -1]];

	// page and limit
	var pageOpt = Number(options.page);
	var limitOpt = Number(options.limit);
	var limit = limitOpt ? limitOpt : 0;
	var skip = pageOpt ? (pageOpt - 1) * limit : 0;
	collection.find(query).skip(skip).limit(limit).sort(sort).toArray(function (e, favorites) {
		if(e) { e.code = '01002'; return cb(e); }

		// merge programs
		var pids = favorites.map(function(favorite){ return favorite.pid });
		self.getBot('ResourceAgent').mergeByPrograms({ pids: pids }, function(err, programs){
			if(err) { return cb(err); }
			else {
				programs.map(function (v, i) {
					var fav = dvalue.search(favorites, {pid: v.pid});
					if(fav) { programs[i].add_to_favorite = fav.ctime; }
				});
				var FPIoptions = {uid: options.uid, programs: programs};
				self.getBot('Payment').fillPaymentInformation(FPIoptions, cb);
			}
		});
	});
};

// fill favorite
/* require: options.uid, options.programs */
Bot.prototype.fillFavoriteData = function (options, cb) {
	if(!options.uid) {
		return cb(null, options.programs.map(function(v) {
			v.is_favorite = false;
			return v;
		}));
	}
	var collection = this.db.collection('Favorites');
	var condition = {uid: options.uid};
	collection.find(condition).toArray(function (e, d) {
		if(e) { e.code = '01002'; cb(e); }
		var programs = options.programs;
		if(Array.isArray(programs)) {
			programs = programs.map(function (v) {
				v.is_favorite = d.some(function (vv) { return vv.pid == v.pid });
				return v;
			});
		}
		else {
			programs.is_favorite = d.some(function (v) { return v.pid == programs.pid });
		}
		cb(null, programs);
	});
};

module.exports = Bot;
