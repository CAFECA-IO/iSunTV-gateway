const ParentBot = require('./_Bot.js');
const util = require('util');
const braintree = require("braintree");

var logger;

// PaymentPlan.type: 1 = 單租, 2 = 套餐, 3 = subscribe
var formatPaymentPlan = function (data) {
	data.type = parseInt(data.type);
	data.fee = data.fee || {};
	if(!(data.type > 0 && data.type <= 3)) { data.type = 1; }
	if(!(data.fee.price > 0)) { data.fee.price = 0; }
	if(!(data.fee.currency)) { data.fee.currency = 'USD'; }
	if(!Array.isArray(data.programs)) { data.programs = []; }
	var PaymentPlan = {
		type: data.type,
		title: data.title || 'PlanX',
		fee: data.fee,
		programs: data.programs
	};
	return PaymentPlan;
};
var descPaymentPlan = function (data, detail) {
	var PaymentPlan = {
		ppid: data._id,
		type: data.type,
		title: data.title,
		fee: data.fee
	};
	if(!!detail) { PaymentPlan.programs = data.programs; }
	return PaymentPlan;
};

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);
	logger = config.logger;
	if(!config || !config.BrainTree) { return false; }

	var btcfg = config.BrainTree;
	btcfg.environment = braintree.Environment.Sandbox;
	this.gateway = braintree.connect(btcfg);
};

Bot.prototype.start = function () {

};

Bot.prototype.createBasicPaymentPlan

Bot.prototype.generateClientToken = function (options, cb) {
	var token = this.gateway.clientToken.generate({}, function (e, d) {
		if(e) { e.code = '57101'; cb(e); }
		else { cb(null, d); }
	});
};

/* require: nonce, plid */
Bot.prototype.checkoutTransaction = function  (options, cb) {
	this.gateway.transaction.sale({
		amount: "10.00",
		paymentMethodNonce: options.nonce,
		options: {
		  submitForSettlement: true
		}
	}, function (e, result) {
		if(e) { e.code = '17201'; cb(e); }
		else { cb(null, result); }
	});
};

module.exports = Bot;
