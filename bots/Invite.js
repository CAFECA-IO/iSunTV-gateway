const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const dvalue = require('dvalue');

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
	//this.initInvitation();
};

// android: QEy9ZKrk
// ios: yQiCiKtn
Bot.prototype.initInvitation = function () {
	var invitations = this.db.collection('Invitations');
	invitations.count({}, function (e, d) {
		if(d == 0) {
			var is = [
				{code: 'QEy9ZKrk', paymentPlan: {
					fee: {price: 300, currency: 'USD'},
					memberfee: {price: 100, currency: 'USD'},
					rentfee: {price: 200, currency: 'USD'},
				}},
				{code: 'yQiCiKtn', paymentPlan: {
					fee: {price: 300, currency: 'USD'},
					memberfee: {price: 100, currency: 'USD'},
					rentfee: {price: 200, currency: 'USD'},
				}}
			];
			invitations.insertMany(is, {}, function () {});
		}
	});
}

module.exports = Bot;