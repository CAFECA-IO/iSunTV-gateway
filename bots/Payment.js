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
	if(!(data.type > 0 && data.type <= 6)) { data.type = 1; }
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
	if(!!detail) { 
		PaymentPlan.programs = data.programs;
		PaymentPlan.ticket = data.ticket;
		PaymentPlan.visible = data.visible;
		PaymentPlan.enable = data.enable;
	}
	delete PaymentPlan._id
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

var formatTicket = function (data) {
	if(Array.isArray(data)) { return data.map(formatTicket); }
	var ticket = {
		type: data.type,
		oid: data.oid,
		uid: data.uid,
		programs: data.programs,
		enable: false,
		expire: data.expire,
		duration: data.duration,
		ctime: data.ctime,
		mtime: data.mtime,
		atime: data.atime
	}
	return ticket;
};

var isPlayable = function (rule, pid) {
	return new RegExp(rule).test(pid);
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
					expire: 86400 * 1000 * 30,
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
				visible: false,
				ticket: {
					expire: 86400 * 1000 * 1,
					duration: 86400 * 1000 * 1
				}
			},
			{
				type: 5,
				title: 'loginFree',
				fee: {
					price: 0,
					currency: 'USD'
				},
				programs: ['^[eE]20'],
				enable: true,
				visible: false,
				ticket: {
					expire: 86400 * 1000 * 1,
					duration: 86400 * 1000 * 1
				}
			},
			{
				type: 6,
				title: 'adFree',
				fee: {
					price: 0,
					currency: 'USD'
				},
				programs: ['^[eE]30'],
				enable: true,
				visible: false,
				ticket: {
					expire: 86400 * 1000 * 1,
					duration: 86400 * 1000 * 1
				}
			},
			{
				type: 7,
				title: 'shareFree',
				fee: {
					price: 0,
					currency: 'USD'
				},
				programs: ['^[eE]40'],
				enable: true,
				visible: false
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

/* require: options.uid, options.programs */
/* playable, ad_to_play, login_to_play, paymentPlans */
Bot.prototype.fillPaymentInformation = function (options, cb) {
	cb = dvalue.default(cb, function () {});
	var self = this, rs;
	var uid = options.uid;
	var programs = options.programs || options.program;
	var fillPlan = function (program) {
		program.paymentPlans = [];
		program.playable = false;
		program.ad_to_play = false;
		program.login_to_play = false;
		self.plans.map(function (v) {
			if(v.programs.some(function (vv) { return isPlayable(vv, program.pid); })) {
				if(v.type == 5) { program.login_to_play = true; }
				else if(v.type == 6) { program.ad_to_play = true; }
				program.paymentPlans.push(v);
			}
		});
		return program;
	};
	if(Array.isArray(programs)) {
		rs = programs.map(fillPlan);
		//-- check tickets
		cb(null, programs);
	}
	else {
		rs = fillPlan(programs);
		var options = {uid: options.uid, pid: programs.pid};
		self.checkPlayable(options, function (e, d) {
			programs.playable = !!d;
			cb(null, programs);
		})
	}
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
	var condition = {_id: new mongodb.ObjectID(options.uid), BrainTreeID: {$exists: true}};
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
				case 6:
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
					options.clientToken = d2.clientToken;
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
			options.fee = d.fee;
			self.fetchTransactionDetail(options, function (e1, d1) {
				if(e1) { return cb(e1); }
				else {
					var now = new Date().getTime();
					var receipt = {
						nonce: options.nonce,
						gateway: options.gateway,
						detail: d1
					};
					var updateQuery = {$set: {receipt: receipt, mtime: now, atime: now}};
					collection.findAndModify(condition, {}, updateQuery, {}, function (e2, d2) {
						if(e2) { e2.code = '01003'; return cb(e2); }
						else {
							self.generateTicket(descOrder(dvalue.default(updateQuery.$set, d)), function () {});
							return cb(null, receipt);
						}
					});
				}
			});
		}
	});


};
/* require: options.gateway, options.nonce, options.fee */
/* gateway: braintree, iosiap */
Bot.prototype.fetchTransactionDetail = function (options, cb) {
	var self = this;
	switch(options.gateway) {
		case 'ios':
			cb(null, {detail: "ok, cool"});
			break;
		case 'braintree':
		default:
			this.gateway.transaction.sale({
				amount: options.fee.price,
				paymentMethodNonce: options.nonce,
				options: {
				  submitForSettlement: true
				}
			}, function (e, result) {
				if(e || !result.success) { e = new Error('payment failed'); e.code = '17201'; cb(e); }
				else {
					self.createBrainTreeID(options, function () {});
					cb(null, result);
				}
			});
	}
};

/* require: options.ppid, options.pid, options.oid, options.uid, options.receipt */
Bot.prototype.generateTicket = function (options, cb) {
	var paymentPlan = this.plans.find(function (v) {return v.ppid == options.ppid});
	if(!paymentPlan) { var e = new Error('failed to generate resource ticket'); e.code = '19901'; return cb(e); }
	var now = new Date().getTime();
	var ticket = {
		type: paymentPlan.type,
		oid: options.oid,
		uid: options.uid,
		enable: false,
		expire: now + paymentPlan.ticket.expire,
		duration: paymentPlan.ticket.duration,
		ctime: now,
		mtime: now,
		atime: now
	};

	// ticket detail
	switch(paymentPlan.type) {
		case 1:
			if(!options.receipt || !paymentPlan.programs.some(function (v) { return isPlayable(v, options.pid); })) {
				var e = new Error('failed to generate resource ticket'); e.code = '19901'; return cb(e);
			}
			ticket.programs = [options.pid];
			break;
		case 2:
			ticket.programs = paymentPlan.programs;
			break;
		case 3:
			ticket.programs = paymentPlan.programs;
			ticket.enable = true;
			break;
		case 4:
		case 5:
			return cb(null);
			break;
		default:
			var e = new Error('failed to generate resource ticket'); e.code = '19901'; return cb(e);
	}
	ticket = formatTicket(ticket);
	var collection = this.db.collection('Tickets');
	collection.insert(ticket, {}, function (e, d) {
		if(e) { e.code = '01001'; return cb(e); }
		else { return cb(null, ticket); }
	});
};

/* require: options.uid */
Bot.prototype.fetchUserTickets = function (options, cb) {

};

/*  require: options.uid, options.pid */
Bot.prototype.isFree = function (options) {
	return this.plans.some(function (v) {
		return (v.type == 5) && isPlayable(v.programs, options.pid) && textype.isObjectID(options.uid)
			|| (v.type == 4 || v.type == 6) && isPlayable(v.programs, options.pid);
	});
};

/*  require: options.uid, options.pid */
Bot.prototype.checkPlayable = function (options, cb) {
	// free program
	if(this.isFree(options)) { return cb(null, true); }
	else if(!textype.isObjectID(options.uid)) { return cb(null, false); }

	// check ticket
	var now = new Date().getTime();
	var collection = this.db.collection('Tickets');
	var condition = {uid: options.uid, expire: {$gt: now}, programs: {$in: [options.pid]}};
	collection.findOne(condition, {}, function (e, d) {
		if(!d) { return cb(null, false); }
		else { return cb(null, true); }
	});
};

/* require: options.uid, options.pid */
Bot.prototype.useTicketByProgram = function (options, cb) {
	var e = new Error('resource access denied'); e.code = '69201'; return cb(e);
};

module.exports = Bot;
