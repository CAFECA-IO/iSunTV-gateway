const ParentBot = require('./_Bot.js');
const util = require('util');

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

Bot.prototype.listChannel = function (cb) {
    cb(null, [{cid: 1}]);
};

/*
  options.cid
  options.uid
 */
Bot.prototype.descChannel = function (options, cb) {

};

module.exports = Bot;
