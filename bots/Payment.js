const ParentBot = require('./_Bot.js');
const util = require('util');
const braintree = require('braintree');
const dvalue = require('dvalue');

var logger;

/*
{
	type: 1,
	title: '單租',
	fee: {
		price: 0.99,
		currency: USD
	},
	programs: ['^[eE][0-9]+'],
	enable: true,
	visible: true,
	ticket: {
		expire: 86400 * 1000 * 7,
		duration: 86400 * 1000 * 3
	}
}
---
{
	type: 2,
	title: '單租',
	fee: {
		price: 0.99,
		currency: USD
	},
	programs: ['^[sS][0-9]+'],
	enable: true,
	visible: true,
	ticket: {
		expire: 86400 * 1000 * 7,
		duration: 86400 * 1000 * 3
	}
}
---
{
	type: 3,
	title: 'VIP',
	fee: {
		price: 9.99,
		currency: USD
	},
	programs: ['^[eEpP][0-9]+'],
	enable: true,
	visible: true,
	ticket: {
		expire: 86400 * 1000 * 7,
		duration: 86400 * 1000 * 30
	}
}
 */

// PaymentPlan.type: 1 = 單租, 2 = 套餐, 3 = subscribe
var formatPaymentPlan = function (data) {
	if (Array.isArray(data)) { return data.map(formatPaymentPlan); }
	data.type = parseInt(data.type);
	data.fee = data.fee || {};
	if(!(data.type > 0 && data.type <= 3)) { data.type = 1; }
	if(!(data.fee.price > 0)) { data.fee.price = 0; }
	if(!(data.fee.currency)) { data.fee.currency = 'USD'; }
	if(!Array.isArray(data.programs)) { data.programs = []; }
	if(data.type == 1 && typeof(data.ticket) != 'object') {
		data.ticket = {
			expire: 86400 * 1000 * 7,
			duration: 86400 * 1000 * 3
		};
	}
	var PaymentPlan = {
		type: data.type,
		title: data.title || 'PlanX',
		fee: data.fee,
		programs: data.programs,
		ticket: data.ticket,
		visible: !!data.visible,
		enable: !!data.enable
	};
	return PaymentPlan;
};
var descPaymentPlan = function (data, detail) {
	if (Array.isArray(data)) { return data.map(function (v) { return descPaymentPlan(v, detail) } ); }
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
	this.plans = [];
};

Bot.prototype.start = function () {
	var self = this;
	this.initialPaymentPlan({}, function () {});
};

Bot.prototype.initialPaymentPlan = function (options, cb) {
	var self = this;
	this.loadPaymentPlan({}, function (e, d) {
		if(Array.isArray(d) && d.length > 0) { return cb(null, d); }
		var basicPlans = [
			{
				type: 1,
				title: '單租',
				fee: {
					price: 0.99,
					currency: 'USD'
				},
				programs: ['^[eE][0-9]+'],
				enable: true,
				visible: true,
				ticket: {
					expire: 86400 * 1000 * 7,
					duration: 86400 * 1000 * 3
				}
			},
			{
				type: 2,
				title: '單租',
				fee: {
					price: 0.99,
					currency: 'USD'
				},
				programs: ['^[sS][0-9]+'],
				enable: true,
				visible: true,
				ticket: {
					expire: 86400 * 1000 * 7,
					duration: 86400 * 1000 * 3
				}
			},
			{
				type: 3,
				title: 'VIP',
				fee: {
					price: 9.99,
					currency: 'USD'
				},
				programs: ['^[eEpP][0-9]+'],
				enable: true,
				visible: true,
				ticket: {
					expire: 86400 * 1000 * 7,
					duration: 86400 * 1000 * 30
				}
			}
		];
		self.plans = basicPlans;
		var collection = self.db.collection('PaymentPlans');
		collection.insertMany(formatPaymentPlan(basicPlans), {}, cb);
	});
};
Bot.prototype.loadPaymentPlan = function (options, cb) {
	var self = this;
	var collection = this.db.collection("PaymentPlans");
	collection.find({enable: true}).toArray(function (e, d) {
		if(Array.isArray(d)) { self.plans = descPaymentPlan(d, true); }
		cb(e, d);
	});
};

Bot.prototype.findPaymentPlan = function (options, cb) {
	cb = dvalue.default(cb, function () {});
	var self = this, rs;
	var fillPlan = function (program) {
		program.paymentPlans = [];
		self.plans.map(function (v) {
			if(v.programs.some(function (vv) { return new RegExp(vv).test(program.pid); })) { program.paymentPlans.push(v); }
		});
		return program;
	};
	if(Array.isArray(options)) {
		rs = options.map(fillPlan);
		cb(null, rs);
		return rs;
	}
	else {
		rs = fillPlan(options);
		cb(null, rs);
		return rs;
	}
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
