const ParentBot = require('./_Bot.js');
const util = require('util');
const braintree = require("braintree");

var logger;

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
