const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const braintree = require('braintree');
const dvalue = require('dvalue');
const textype = require('textype');

const defaultPeriod = 86400 * 1000 * 30;

var logger;

// PaymentPlan.type: 1 = 單租, 2 = 套餐, 3 = subscribe, 4 = free, 5 = login to free
var formatPaymentPlan = function (data) {
	if (Array.isArray(data)) { return data.map(formatPaymentPlan); }
	data.type = parseInt(data.type);
	data.fee = data.fee || {};
	if(!(data.type > 0 && data.type <= 9)) { data.type = 1; }
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
		enable: !!data.enable,
		gpid: data.gpid
	};
	return PaymentPlan;
};
var descPaymentPlan = function (data, detail) {
	if (Array.isArray(data)) { return data.map(function (v) { return descPaymentPlan(v, detail) } ); }
	var PaymentPlan = {
		ppid: data._id.toString(),
		type: data.type,
		title: data.title,
		fee: data.fee
	};
	data.gpid = data.gpid || {};
	PaymentPlan.gpid = {
		braintree: !!data.gpid.braintree? data.gpid.braintree: false,
		iosiap: !!data.gpid.iosiap? data.gpid.iosiap: false
	};

	if(!!detail) { 
		PaymentPlan.programs = data.programs;
		PaymentPlan.ticket = data.ticket;
		PaymentPlan.visible = data.visible;
		PaymentPlan.enable = data.enable;
	}
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
	data.oid = data._id.toString();
	delete data._id;
	return data;
};

var formatTicket = function (data) {
	if(Array.isArray(data)) { return data.map(formatTicket); }
	var now = new Date().getTime();
	var ticket = {
		type: data.type,
		gateway: data.gateway,
		oid: data.oid,
		uid: data.uid,
		ppid: data.ppid,
		programs: data.programs,
		enable: false,
		expire: data.expire,
		duration: data.duration,
		subscribe: !!data.subscribe,
		ctime: data.ctime || now,
		mtime: data.mtime || now,
		atime: data.atime || now
	};
	return ticket;
};

var isPlayable = function (rule, pid) {
	if(Array.isArray(rule)) {
		return rule.some(function (v) { return new RegExp(v).test(pid); });
	}
	else {
		return new RegExp(rule).test(pid);
	}
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
				programs: [],
				enable: true,
				visible: true,
				ticket: {
					expire: 86400 * 1000 * 30,
					duration: 86400 * 1000 * 2
				},
				gpid: {
					braintree: 'SingleRent',
					iosiap: 'SingleRent'
				}
			},
			{
				type: 2,
				title: '單租',
				fee: {
					price: 0.99,
					currency: 'USD'
				},
				programs: [],
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
					price: 6.95,
					currency: 'USD'
				},
				programs: [],
				enable: true,
				visible: true,
				ticket: {
					expire: 86400 * 1000 * 30,
					duration: 86400 * 1000 * 30
				},
				gpid: {
					braintree: 'MonthVIP',
					iosiap: 'MonthVIP'
				}
			},
			{
				type: 4,
				title: 'Free',
				fee: {
					price: 0,
					currency: 'USD'
				},
				programs: [],
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
				programs: [],
				enable: true,
				visible: true,
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
				programs: [],
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
				programs: [],
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
/* require: options.ppid, options.programs */
Bot.prototype.updatePaymentPlan = function(options, cb) {
	if(!textype.isObjectID(options.ppid)) { var e = new Error('payment plan not found'); e.code = '39801'; return cb(e); }
	if(!Array.isArray(options.programs)) { options.programs = []; }
	var self = this;
	var collection = this.db.collection("PaymentPlans");
	var condition = {_id: new mongodb.ObjectID(options.ppid)};
	var updateQuery = {$set: {programs: options.programs}};
	collection.findAndModify(condition, {}, updateQuery, {}, function (e, d) {
		if(e) { e.code = '01003'; cb(e); }
		else {
			self.plans.some(function (v, i) { if(v.ppid == options.ppid) {
				self.plans[i].programs = options.programs;
				return true;
			}});
		}
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
		program.free_to_play = false;
		program.ad_to_play = false;
		program.login_to_play = false;
		self.plans.map(function (v) {
			if(v.programs.some(function (vv) { return isPlayable(vv, program.pid); })) {
				if(v.type == 4) { program.free_to_play = true; }
				else if(v.type == 5) { program.login_to_play = true; }
				else if(v.type == 6) { program.ad_to_play = true; }
				var plan = dvalue.clone(v);
				delete plan.programs;
				program.paymentPlans.push(plan);
			}
		});
		return program;
	};
	if(Array.isArray(programs)) {
		// check tickets
		var futOptions = {uid: options.uid};
		this.fetchUserTickets(futOptions, function (e, d) {
			rs = programs.map(function (v) {
				v = fillPlan(v);
				v.playable = self.isFree({uid: options.uid, pid: v.pid}) || d.some(function (v2) {
					return v2.programs.some(function (v3) {
						return new RegExp(v3).test(v.pid);
					});
				});
				return v;
			});
			cb(null, programs);
		});
	}
	else {
		rs = fillPlan(programs);
		var options = {uid: options.uid, pid: programs.pid};
		this.checkPlayable(options, function (e, d) {
			programs.playable = !!d;
			cb(null, programs);
		});
	}
};

/* require: options.uid */
Bot.prototype.fillVIPInformation = function (options, cb) {
	var self = this;
	var subcribeOptions = {uids: [options.uid]};
	this.fetchSubscribeTickets(subcribeOptions, function (e, d) {
		if(e) { return cb(e); }
		if(!Array.isArray(d) || d.length == 0) {
			var pp = self.plans.find(function (v) { return v.type == 3; });
			options.paymentstatus = {
				gateway: 'free',
				ppid: pp.ppid,
				fee: pp.fee,
				expire: 0,
				next_charge: 0
			};
			return cb(null, options);
		}
		else {
			var now = new Date().getTime();
			var ticket = d.reduce(function (pre, curr) { return curr.expire > pre.expire? curr: pre; }, {expire: 0});
			var pp = self.plans.find(function (v) { return v.ppid == ticket.ppid; });
			options.paymentstatus = {
				gateway: now > ticket.expire? 'free': ticket.gateway,
				ppid: ticket.ppid,
				fee: pp.fee,
				expire: ticket.expire,
				next_charge: (now > ticket.expire || !ticket.subscribe)? 0: ticket.expire
			};
			return cb(null, options);
		}
	});
};

/* optional: options.uids */
Bot.prototype.fetchSubscribeTickets = function (options, cb) {
	var self = this;
	var collection = this.db.collection('Tickets');
	var now = new Date().getTime();
	var uids = Array.isArray(options.uids)? options.uids: [options.uids];
	var condition = {type: 3, uid: {$in: uids}};
	collection.find(condition).toArray(function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		if(!Array.isArray(d)) { d = []; }
		d = d.map(function (v) {
			var pp = self.plans.find(function (v1) { return v1.ppid == v.ppid; });
			v.fee = pp.fee;
			return v;
		});
		cb(null, d);
	});
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
	var condition = {_id: new mongodb.ObjectID(options.uid)};
	var collection = this.db.collection('Users');
	collection.findOne(condition, {}, function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!d.verified) {
			e = new Error('Account not verified');
			e.code = '69101';
			return cb(e);
		}
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
					var programs_condition = {pid: options.pid};
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
				// 套餐費用 = 總片長 * 單價
				case 2:
					var fee = d.fee;
					var programs_collection = self.db.collection("Programs");
					var programs_condition = {pid: options.pid};
					programs_collection.findOne(programs_condition, {}, function (ee, dd) {
						if(ee) { ee.code = '01002'; return cb(ee); }
						else if(!dd) { ee = new Error('program not found'); ee.code = '39201'; return cb(ee); }
						else {
							var unit = Math.ceil(dd.number_of_episodes) || 1;
							fee.price = ((fee.price * unit) || 0 ).toFixed(2);
							return cb(null, fee);
						}
					});
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
			if(e1) { return cb(e1); }
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
	var self = this;
	options.gateway = dvalue.default(options.gateway, 'BrainTree').toLowerCase();

	if(options.gateway == 'iosiap') { return cb(null, true); } //-- for iOS IAP

	if(!textype.isObjectID(options.oid)) { var e = new Error('order not found'); e.code = '39701'; return cb(e); }
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
							var checkoutResult = {gateway: receipt.gateway, fee: options.fee};
							return cb(null, checkoutResult);
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
		gateway: options.receipt.gateway,
		oid: options.oid,
		uid: options.uid,
		ppid: options.ppid,
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

/* require: options.uid, duration */
Bot.prototype.renewVIP = function (options, cb) {
	var collection = this.db.collection('Tickets');
	var condition = {uid: options.uid, type: 3};
	var orderby = {expire: -1};
	collection.update({uid: options.uid, type: 3}, {$set: {subscribe: false}}, {}, function (e1, d1) {});
	collection.find(condition).sort(orderby).limit(1).toArray(function (e, d) {
		if(e) { e.code = '01002'; }
		ticket = d[0] || {};
		var now = new Date().getTime();
		ticket.duration = ticket.duration || defaultPeriod;
		ticket.expire = tocket.expire > now? ticket.duration + defaultPeriod: now + ticket.duration;
		ticket.subscribe = true;
		ticket = formatTicket(ticket);
		collection.insert(ticket, {}, function (e2, d2) {
			if(e2) { e2.code = '01001'; return cb(e2); }
			else { cb(null, ticket); }
		});
	});
};

/* require: options.uid */
Bot.prototype.subscribe = function (options, cb) {

};

/* require: options.uid */
Bot.prototype.autoRenew = function (options, cb) {

};

/* require: options.uid */
Bot.prototype.fetchUserTickets = function (options, cb) {
	var collection = this.db.collection('Tickets');
	var condition = {uid: options.uid, expire: {$gt: new Date().getTime()}};
	collection.find(condition).toArray(function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		cb(null, d);
	});
};

/*  require: options.uid, options.pid */
Bot.prototype.isFree = function (options) {
	return this.plans.some(function (v) {
		return (v.type == 5) && isPlayable(v.programs, options.pid) && textype.isObjectID(options.uid)
			|| (v.type == 4 || v.type == 6) && isPlayable(v.programs, options.pid);
	});
};

/* require: options */
Bot.prototype.findPlan = function (keyword) {
	var plans = [];
	switch(keyword) {
		case 'VIP':
			var p = dvalue.clone(this.plans.find(function (v) { return v.type == 3; }));
			delete p.programs;
			plans.push(p);
			break;
		case 'Free':
			var p = dvalue.clone(this.plans.find(function (v) { return v.type == 4; }));
			delete p.programs;
			plans.push(p);
			break;
		case 'Member':
			var p = dvalue.clone(this.plans.find(function (v) { return v.type == 5; }));
			delete p.programs;
			plans.push(p);
			break;
	}
	if(plans.length == 0) {
		var p = dvalue.clone(this.plans.find(function (v) { return v.type == 4; }));
		delete p.programs;
		plans.push(p);
	}
	return plans;
};

/* require: options.uid, options.pid */
/* do not support multiple data */
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
