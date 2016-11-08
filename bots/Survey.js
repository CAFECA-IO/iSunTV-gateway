const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const dvalue = require('dvalue');
const textype = require('textype');

var logger;

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

//api 601
Bot.prototype.add = function (options, cb) {
	var table = 'Survey_' + options.topic;
	var collection = this.db.collection(table);
	var condition = {uid: options.uid};
	var updateQuery = {$set: {data: options.data, ctime: new Date().getTime()}};
	collection.findAndModify(condition, {}, updateQuery, {upsert: true}, function (e, d) {
		if(e) { e.code = '01003'; return cb(e); }
		return cb(null, true);
	});
};

module.exports = Bot;
