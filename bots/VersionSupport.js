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
	this.loadVersion({}, function () {});
};


/*
{type: 'iOS', version: ['1.5.2(53)']}
{type: 'Android', version: ['1.0.10']}
 */
Bot.prototype.loadVersion = function (options, cb) {
	var self = this;
	var versions = this.db.collection("Versions");
	versions.find({}).toArray(function (e, d) {
		if(!Array.isArray(d) || d.length == 0) {
			self.versions = [
				{type: 'iOS', versions: ['1.5.2(53)']},
				{type: 'Android', versions: ['1.0.10']}
			];
			versions.insertMany(self.versions, {}, function () {});
		}
		else {
			self.versions = d;
		}
	});
};

// require: type, version
// response: latest, forceUpdate, suggestUpdate
Bot.prototype.checkVersion = function (options) {
	var self = this;
	var promise = new Promise(function (resolve, reject) {
		var type = options.type || '';
		var version = options.version || '';
		var app = self.versions.find(function (v) { return v.type == type; }) || {versions: ['0.0.0']};
		var result = {
			latest: app.versions[0],
			forceUpdate: !app.type? false: (app.versions.indexOf(version) == -1),
			suggestUpdate: !app.type? false:  (app.versions.indexOf(version) != 0)
		}
		resolve(result);
	});

	return promise;
};


module.exports = Bot;
