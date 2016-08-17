const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const braintree = require('braintree');
const dvalue = require('dvalue');
const textype = require('textype');

var logger;

// PaymentPlan.type: 1 = 單租, 2 = 套餐, 3 = subscribe, 4 = free, 5 = login to free
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

var formatOrder = function (data) {
	if(Array.isArray(data)) { return data.map(formatOrder); }
	var order = {
		uid: data.uid,
		ppid: data.ppid,
		pid: data.pid,
		clientToken: data.clientToken,
		fee: data.fee
	};
	order.ctime = data.ctime || new Date().getTime();
	order.mtime = data.mtime || order.ctime;
	order.atime = data.atime || order.ctime;
	return order;
};
var descOrder = function (data) {
	if(Array.isArray(data)) { return data.map(descOrder); }
	data.oid = data._id;
	delete data._id;
	return data;
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
					expire: 86400 * 1000 * 30,
					duration: 86400 * 1000 * 2
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
					expire: 86400 * 1000 * 30,
					duration: 86400 * 1000 * 2
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
			},
			{
				type: 4,
				title: 'Free',
				fee: {
					price: 0,
					currency: 'USD'
				},
				programs: ['^[eE]10'],
				enable: true,
				visible: true,
				ticket: {
					expire: 86400 * 1000 * 1,
					duration: 86400 * 1000 * 1
				}
			},
			{
				type: 5,
				title: 'Free',
				fee: {
					price: 0,
					currency: 'USD'
				},
				programs: ['^[eE]20'],
				enable: true,
				visible: true,
				ticket: {
					expire: 86400 * 1000 * 1,
					duration: 86400 * 1000 * 1
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

/* require: options.uid */
Bot.prototype.getUserTickets = function (options, cb) {

};
Bot.prototype.checkPlayable = function (options, cb) {

};

/* require: uid, nonce */
Bot.prototype.createBrainTreeID = function (options, cb) {
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	var self = this;
	var condition = {_id: new mongodb.ObjectID(options.uid)};
	var collection = this.db.collection('Users');
	collection.findOne(condition, {}, function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!d) {
			e = new Error('user not found');
			e.code = '39102';
			return cb(e);
		}
		else if(!!d.BrainTreeID) {
			return cb(null, d.BrainTreeID);
		}
		else {
			self.gateway.customer.create({
				email: d.email
			}, function (err, result) {
				if(result.success) {
					delete condition.BrainTreeID;
					var updateQuery = {$set: {BrainTreeID: result.customer.id}};
					collection.findAndModify(condition, {}, updateQuery, {}, function (e1, d1) {
						if(e1) { e1.code = '01003'; return cb(e1); }
						else { cb(null, result.customer.id); }
					});
				}
				else {
					err = new Error('remote api error');
					err.code = '54001';
					cb(err);
				}
			});
		}
	});
};
/* require: uid */
Bot.prototype.fetchBrainTreeID = function (options, cb) {
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	var self = this;
	var condition = {_id: new mongodb.ObjectID(options.uid), BrainTreeID: {$exist: true}};
	var collection = this.db.collection('Users');
	collection.findOne(condition, {}, function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		else {
			return cb(null, d? d.BrainTreeID: undefined);
		}
	});
};

/* require: options.ppid */
/* optional: options.pid */
Bot.prototype.fetchPrice = function (options, cb) {
	if(!textype.isObjectID(options.ppid)) { var e = new Error('payment plan not found'); e.code = '39801'; return cb(e); }
	var self = this;
	var plans_collection = this.db.collection("PaymentPlans");
	var plans_condition = {_id: new mongodb.ObjectID(options.ppid)};
	plans_collection.findOne(plans_condition, {}, function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!d) { e = new Error('payment plan not found'); e.code = '39801'; return cb(e); }
		else {
			fee = d.fee;
			switch(d.type) {
				// 單租費用 = 片長 * 單價
				case 1:
					var fee = d.fee;
					var programs_collection = self.db.collection("Programs");
					var programs_condition = {_id: options.pid};
					programs_collection.findOne(programs_condition, {}, function (ee, dd) {
						if(ee) { ee.code = '01002'; return cb(ee); }
						else if(!dd) { ee = new Error('program not found'); ee.code = '39201'; return cb(ee); }
						else {
							var unit = Math.ceil(dd.duration / 30) || 1;
							fee.price = ((fee.price * unit) || 0 ).toFixed(2);
							return cb(null, fee);
						}
					});
					break;
				//-- 套餐費用 = 總片長 * 單價
				case 2:
					var fee = d.fee;
					return cb(null, fee);
					break;
				// VIP 費用 = 單價
				case 3:
					var fee = d.fee;
					return cb(null, fee);
					break;
				// 免費影片
				case 4:
				case 5:
				default:
					var fee = {
						price: 0,
						currency: 'USD'
					};
					return cb(null, fee);
			}
		}
	});
};

/* require: options.uid, options.ppid */
/* optional: options.pid */
Bot.prototype.order = function (options, cb) {
	if(!textype.isObjectID(options.uid) || !textype.isObjectID(options.ppid)) { var e = new Error('invalid order'); e.code = '19701'; return cb(e); }
	var self = this;
	this.fetchPrice(options, function (e, d) {
		if(e) { return cb(e); }
		else { options.fee = d; }
		self.fetchBrainTreeID(options, function (e1, d1) {
			var cond = {};
			if(d1) { cond.customerId = d1; }
			self.gateway.clientToken.generate(cond, function (e2, d2) {
				if(e2) { e2.code = '57101'; cb(e2); }
				else {
					options.clientToken = d.clientToken;
					var order = formatOrder(options);
					var collection = self.db.collection('Orders');
					collection.insert(order, {}, function (e3, d3) {
						if(e3) { e3.code = '01001'; return cb(e3); }
						else { return cb(null, descOrder(order)); }
					});
				}
			});
		});
	});
};

/* require: options.nonce, options.oid, options.uid, options.gateway */
/* gateway: braintree, iosiap */
Bot.prototype.checkoutTransaction = function (options, cb) {
	if(!textype.isObjectID(options.oid)) { var e = new Error('order not found'); e.code = '39701'; return cb(e); }
	var self = this;
	options.gateway = dvalue.default(options.gateway, 'BrainTree').toLowerCase();

	// load order detail
	var collection = this.db.collection('Orders');
	var condition = {_id: new mongodb.ObjectID(options.oid)};
	collection.findOne(condition, {}, function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!d) { var e = new Error('order not found'); e.code = '39701'; return cb(e); }
		else {

		}
	});

	this.gateway.transaction.sale({
		amount: "10.00",
		paymentMethodNonce: options.nonce,
		options: {
		  submitForSettlement: true
		}
	}, function (e, result) {
		if(e) { e.code = '17201'; cb(e); }
		else {
			self.createBrainTreeID(options, function () {});
			cb(null, result);
		}
	});
};
Bot.prototype.fetchTransactionDetail = function (options, cb) {

};

Bot.prototype.generateTicket = function () {

};

Bot.prototype.openTicket = function () {

};

module.exports = Bot;
