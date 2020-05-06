const ParentBot = require('./_Bot.js');
const util = require('util');

// 30 Days Interval = 1000 * 60 * 60 * 24 * 30
const timeInterval = 2592000000;

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

Bot.prototype.getAllUserCount = function () {
	const collection = this.db.collection('Users');
	const condition = {};
	return new Promise((resolve, reject) => {
		collection.count(condition, function (e, d) {
			if(e) {
				e.code = 0;
				return reject(e);
			}
			else {
				return resolve({TotalUserCount: d});
			}
		});
	});
};

Bot.prototype.getUserIncreasement = function (startTime, endTime) {
	const collection = this.db.collection('Users');
	const condition = {ctime: {$gte: startTime, $lt: endTime}};
	return new Promise((resolve, reject) => {
		collection.count(condition, function (e, d) {
			if(e) {
				e.code = 0;
				return reject(e);
			}
			else {
				return resolve({UserIncreasement: d});
			}
		});
	});
};

Bot.prototype.getOrderIncreasement = function(startTime, endTime) {
	const collection = this.db.collection('Orders');
	const condition = {ctime: {$gte: startTime, $lt: endTime}};
	return new Promise((resolve, reject) => {
		collection.count(condition, function (e, d) {
			if(e) {
				e.code = 0;
				return reject(e);
			}
			else {
				return resolve({OrderIncreasement: d});
			}
		});
	});
};

Bot.prototype.getPayedOrderIncreasement = function(startTime, endTime) {
	const collection = this.db.collection('Orders');
	const condition = {atime: {$gte: startTime, $lt: endTime}, 'receipt.detail.success': true};
	return new Promise((resolve, reject) => {
		collection.count(condition, function (e, d) {
			if(e) {
				e.code = 0;
				return reject(e);
			}
			else {
				return resolve({PayedOrderIncreasement: d});
			}
		});
	});
};

Bot.prototype.getTotalVedioWatchingCount = function(startTime, endTime) {
	const collection = this.db.collection('Watching_programs');
	const condition = {atime: {$gte: startTime, $lt: endTime}};
	return new Promise((resolve, reject) => {
		collection.count(condition, function (e, d) {
			if(e) {
				e.code = 0;
				return reject(e);
			}
			else {
				return resolve({TotalVedioWatchingCount: d});
			}
		});
	});
}

Bot.prototype.getReport = function(options, cb) {
	let etime = options.endTime;
	let stime = options.startTime;
	if (!etime) etime = Date.now();
	if (!stime) stime = etime - timeInterval;
	const arr = [];

	arr.push(this.getAllUserCount());
	arr.push(this.getUserIncreasement(stime, etime));
	arr.push(this.getOrderIncreasement(stime, etime));
	arr.push(this.getPayedOrderIncreasement(stime, etime));
	arr.push(this.getTotalVedioWatchingCount(stime, etime));

	return Promise.all(arr).then((results) => {
		let r = {};
		results.map((result) => r = {...r, ...result});
		return cb(null, r)
	}).catch((e)=> cb(e));
}
module.exports = Bot;
