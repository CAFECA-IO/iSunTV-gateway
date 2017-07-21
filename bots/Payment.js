const ParentBot = require('./_Bot.js');
const util = require('util');
const url = require('url');
const mongodb = require('mongodb');
const braintree = require('braintree');
const dvalue = require('dvalue');
const textype = require('textype');

const request = require('../utils/Crawler.js').request;

var defaultPeriod = 86400 * 1000 * 365;
var trialPeriod = 86400  * 1000 * 0;

var logger;
var requireEmailVerification = false;

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
	data.oid = data._id;
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
		enable: !!data.enable,
		expire: data.expire,
		trial: data.trial || 0,
		charge: data.charge || now,
		duration: data.duration,
		subscribe: data.subscribe,
		ctime: data.ctime || now,
		mtime: data.mtime || now,
		atime: data.atime || now
	};
	return ticket;
};

var descBill = function (data) {
	if(Array.isArray(data)) { return data.map(descBill); }
	data.receipt = data.receipt || {};
	var bill = {
		oid: data._id.toString(),
		ppid: data.ppid,
		pid: data.pid,
		gateway: data.receipt.gateway,
		fee: data.fee,
		ctime: data.ctime,
		mtime: data.mtime
	};
	return bill;
};

var formatMember = function (data) {
	return data;
};

var descMember = function (data) {
	if(!data) { return undefined; }
	data.mcid = data._id.toString();
	delete data._id;
	return data;
};

var isPlayable = function (rule, pid) {
	if(Array.isArray(rule)) {
		return rule.some(function (v) { return new RegExp('^' + v + '$').test(pid); });
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
	defaultPeriod = config.subscribe.period;
	trialPeriod = config.subscribe.trial;
	if(!config || !config.BrainTree) { return false; }

	var btcfg = config.production? config.BrainTree.production: config.BrainTree.sandbox;
	btcfg.environment = config.production? braintree.Environment.Production: braintree.Environment.Sandbox;
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
					currency: 'US$'
				},
				programs: [],
				enable: true,
				visible: true,
				ticket: {
					expire: 86400 * 1000 * 30,
					duration: 86400 * 1000 * 2
				},
				gpid: {
					braintree: 'Rent1',
					iosiap: 'Rent1'
				}
			},
			{
				type: 2,
				title: '單租',
				fee: {
					price: 0.99,
					currency: 'US$'
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
					price: 4.99,
					currency: 'US$'
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
					iosiap: 'subscribemonthlyfee'
				}
			},
			{
				type: 4,
				title: 'Free',
				fee: {
					price: 0,
					currency: 'US$'
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
					currency: 'US$'
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
					currency: 'US$'
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
					currency: 'US$'
				},
				programs: [],
				enable: true,
				visible: false
			}
		];
		var collection = self.db.collection('PaymentPlans');
		collection.insertMany(formatPaymentPlan(basicPlans), {}, function (e2, d2) {
			self.plans = descPaymentPlan(d2.ops);
			self.getBot('ResourceAgent').crawl({}, cb);
		});
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
			if(isPlayable(v.programs, program.pid)) {
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
				var now = new Date().getTime();
				v = fillPlan(v);
				v.playable = self.isFree({uid: options.uid, pid: v.pid}) || d.some(function (v2) {
					return v2.enable && v2.expire > now && 
					(v2.programs.some(function (v3) { return new RegExp(v3).test(v.pid); }) || (v2.type == 3 && self.isVIPProgram(v.pid)));
				})
				return v;
			});
			cb(null, rs);
		});
	}
	else {
		rs = fillPlan(programs);
		var options = {uid: options.uid, pid: programs.pid};
		this.checkPlayable(options, function (e, d) {
			programs.playable = !!d;
			if(!programs.playable) { programs.stream = ''; }
			cb(null, programs);
		});
	}
};

// require: options.uid
Bot.prototype.generateMemberCard = function (options, cb) {
	var self = this;
	var promise = new Promise(function (resolve, reject) {
		var member = formatMember(options);
		var members = self.db.collection('Members');
		members.insert(member, function (e, d) {
			if(e) {
				e.code = '01001';
				reject(e);
			}
			else {
				member = descMember(member);
				resolve(member);
			}
		});
	});

	return promise;
};

// require: options.uid
// return promise
Bot.prototype.getMemberCard = function (options, cb) {
	var self = this;
	var promise = new Promise(function (resolve, reject) {
		var members = self.db.collection('Members');
		var condition = {uid: options.uid};
		members.findOne(condition, {}, function (e, d) {
			if(e) {
				e.code = '01002';
				reject(e);
			}
			else {
				var member = descMember(d);
				resolve(member);
			}
		});
	});

	return promise;
};

// require: mcid
Bot.prototype.getTicketByMemberCard = function (options, cb) {
	var self = this;
	var tickets = [];
	var promise = new Promise(function (resolve, reject) {
		if(!options) { resolve(tickets); return; }
		var collection = self.db.collection('Tickets');
		var now = new Date().getTime();
		var mcid = options.mcid;
		var condition = {type: 3, mcid: mcid};
		collection.find(condition).toArray(function (e, d) {
			if(e) { e.code = '01002'; reject(e); }
			if(!Array.isArray(d)) { d = []; }
			tickets = d.map(function (v) {
				if(!v) { return undefined; }
				var pp = self.plans.find(function (v1) { return v1.ppid == v.ppid; });
				if(!pp) { return undefined; }
				v.fee = dvalue.clone(pp.fee);
				return v;
			}).filter(function (v) { return v != undefined; });
			resolve(tickets);
		});
	});

	return promise;
};

// require: uid
//++ require: mcid
Bot.prototype.getPriceWithDiscount = function (options, cb) {
	var self = this;
	var promise = new Promise(function (resolve, reject) {
		var pp = self.plans.find(function (v) { return v.type == 3; });
		var member = self.config.subscribe.member;
		var annual = pp.fee.price;
		var users = self.db.collection("Users");
		var userOpts = {_id: new mongodb.ObjectId(options.uid)};
		users.findOne(userOpts, {}, function (e, d) {
			if(e) {
				e.code = '01002';
				reject(e);
			}
			else if(!d) {
				e = new Error('User not found');
				e.code = '39102';
				reject(e);
			}
			else {
				discount = d.discount || [];
				var fee = {
					discount: discount,
					memberfee: {price: member.price, currency: member.currency},
					annualfee: {price: pp.fee.price, currency: pp.fee.currency}
				};
				if(discount.indexOf("memberfree") > -1) { fee.memberfee.price = 0; }
				if(discount.indexOf("rentfree") > -1) { fee.annualfee.price = 0; }
				if(discount.indexOf("rent-4001") > -1) { fee.annualfee.price = 19.99; }
				fee.fee = {price: fee.memberfee.price + fee.annualfee.price, currency: fee.memberfee.currency};
				resolve(fee);
			}
		});
	});

	return promise;
}

// require: options.uid
Bot.prototype.getSubscribeOptions = function (options, cb) {
	var self = this;
	var members = this.db.collection("Members");
	var result = {
		mcid: false,
		tickets: [],
		discount: [],
		fee: {},
		memberfee: {},
		annualfee: {}
	};
	var promise = new Promise(function (resolve, reject) {
		// has member card ?
		self.getMemberCard(options).then(function (d) {
			if(d) { result.mcid = d.mcid; }
			return self.getTicketByMemberCard(d);
		}).then(function (d) {
			result.tickets = d;
			return self.getPriceWithDiscount(options);
		}).then(function (d) {
			result.discount = d.discount;
			result.fee = d.fee;
			result.memberfee = d.memberfee;
			result.annualfee = d.annualfee;
			resolve(result);
		}).catch(function (e) {
			reject(e);
		});
	});

	return promise;
};

/* require: options.uid */
Bot.prototype.fillVIPInformation = function (options, cb) {
	var self = this;
	var status = ['subscribe', 'cancel', 're-subscribe'];
	var subcribeOptions = {uids: [options.uid]};
	// add member fee
	var memberprice = 0;
	try {
		memberprice = self.config.subscribe.member.price;
	} catch(e2) {}
	this.fetchSubscribeTickets(subcribeOptions, function (e, d) {
		if(e) { return cb(e); }
		if(!Array.isArray(d) || d.length == 0) {
			var pp = self.plans.find(function (v) { return v.type == 3; });
			var rentfee = dvalue.clone(pp.fee);
			var memberfee = {
				price: memberprice,
				currency: rentfee.currency
			};

			// discount - no member fee
			if(options.discount.indexOf("memberfree") > -1) {
				memberfee.original = memberfee.price;
				memberfee.price = 0;
			}

			// discount - no rent fee
			if(options.discount.indexOf("rentfree") > -1) {
				rentfee.original = rentfee.price;
				rentfee.price = 0;
			}

			var totalfee = {
				price: rentfee.price + memberfee.price,
				currency: rentfee.currency
			};

			options.member = false;
			options.paymentstatus = {
				status: status[0],
				gateway: 'free',
				ppid: pp.ppid,
				memberfee: memberfee,
				rentfee: rentfee,
				fee: totalfee,
				expire: 0,
				trial: 0,
				next_charge: 0
			};
			return cb(null, options);
		}
		else {
			var now = new Date().getTime();
			var ticket = d.reduce(function (pre, curr) { return curr.expire > pre.expire? curr: pre; }, {expire: 0});
			var pp = self.plans.find(function (v) { return v.ppid == ticket.ppid; });
			var rentfee = dvalue.clone(pp.fee);
			var memberfee = {
				price: memberprice,
				currency: rentfee.currency
			};

			// discount - no member fee
			memberfee.price = 0;
			
			var totalfee = {
				price: rentfee.price + memberfee.price,
				currency: rentfee.currency
			};

			options.member = (ticket.expire > now);
			options.paymentstatus = {
				status: ticket.expire > 0? ticket.subscribe? status[1]: status[2] : status[0],
				gateway: now > ticket.expire? 'free': ticket.gateway,
				ppid: ticket.ppid,
				memberfee: memberfee,
				rentfee: rentfee,
				fee: totalfee,
				expire: ticket.expire,
				trial: 0,
				next_charge: (now > ticket.expire || !ticket.subscribe)? 0: (ticket.charge > now && ticket.gateway != 'iosiap'? ticket.charge: ticket.expire)
			};
			if(ticket.trial > now) { options.paymentstatus.trial = ticket.trial; }
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
			if(!pp) { return undefined; }
			v.fee = dvalue.clone(pp.fee);
			return v;
		}).filter(function (v) { return v != undefined; });
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
		else if(requireEmailVerification && !d.verified) {
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
/* optional: options.transaction */
/* gateway: braintree, iosiap */
Bot.prototype.checkoutTransaction = function (options, cb) {
	var self = this;
	options.gateway = dvalue.default(options.gateway, 'BrainTree').toLowerCase();

	// for iOS IAP
	if(options.gateway == 'iosiap') {
		self.fetchTransactionDetail(options, function (e1, d1) {
			if(e1) { return (e1.code == '97002')? cb(null, {}): cb(e1); }
			else {
				var now = new Date().getTime();
				var receipt = {
					nonce: options.nonce,
					gateway: options.gateway,
					detail: d1
				};
				var condition = {_id: d1.order.oid};
				var updateQuery = {$set: {receipt: receipt, mtime: now, atime: now}};
				self.db.collection('Orders').findAndModify(condition, {}, updateQuery, {}, function (e2, d2) {
					if(e2) { e2.code = '01003'; return cb(e2); }
					else if(!d2.value) { e2 = new Error('Order not found'); e2.code = '39701'; return cb(e2); }
					else {
						d2.value._id = options.oid;
						d2.value.trial = d1._trial;
						d2.value.charge = d1._charge
						d2.value.subscribe = d1._subscribe;
						var ticket = descOrder(dvalue.default(updateQuery.$set, d2.value));
						self.generateTicket(ticket, function () {});
						var checkoutResult = {gateway: receipt.gateway, fee: d2.value.fee};
						return cb(null, checkoutResult);
					}
				});
			}
		});
		return;
	}

	if(!textype.isObjectID(options.oid)) { var e = new Error('order not found'); e.code = '39701'; return cb(e); }
	// load order detail
	var collection = this.db.collection('Orders');
	var condition = {_id: new mongodb.ObjectID(options.oid)};
	collection.findOne(condition, {}, function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!d) { e = new Error('order not found'); e.code = '39701'; return cb(e); }
		else if(!!d.receipt) { e = new Error('duplicate payment'); e.code = '97001'; return cb(e); }
		else {
			options.fee = d.fee;
			options.type = d.type;
			options.clientToken = d.clientToken;
			options.ppid = d.ppid;
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
						else if(!d2.value) { e2 = new Error('Order not found'); e2.code = '39701'; return cb(e2); }
						else {
							d._id = options.oid;
							d.trial = d1._trial;
							d.charge = d1._charge
							d.subscribe = d1._subscribe;
							var ticket = descOrder(dvalue.default(updateQuery.$set, d));
							self.generateTicket(ticket, function () {});
							var checkoutResult = {gateway: receipt.gateway, fee: options.fee};
							return cb(null, checkoutResult);
						}
					});
				}
			});
		}
	});
};
/* require: options.gateway, options.nonce, options.fee, options.clientToken, options.type, options.uid, options.transaction */
/* gateway: braintree, iosiap */
Bot.prototype.fetchTransactionDetail = function (options, cb) {
	var self = this;
	options.transaction = options.transaction? options.transaction.toString(): '';
	switch(options.gateway) {
		case 'iosiap':
			var verifiedUrl = this.config.productioniOS? this.config.ios.productionUrl: this.config.ios.sandBoxUrl;
			var requestOptions = url.parse(verifiedUrl);
			requestOptions.method = 'POST';
			requestOptions.post = {'password': this.config.ios.password, 'receipt-data': options.nonce};
			requestOptions.datatype = 'json';
			requestOptions.headers = {'Content-Type': 'application/json', 'Content-Length': JSON.stringify(requestOptions.post).length};
			request(requestOptions, function (e, d) {
				var rs = d.data, gpid, ppid;
				if(e) { e.code = '54001'; return cb(e); }
				else if(rs.status != 0) { e = new Error('payment failed'); e.code = '87201'; return cb(e); }
				else {
					// find current receipt
					var receipt;
					rs.receipt.in_app.map(function (v) {
						if(v.transaction_id == options.transaction) {
							if(receipt && receipt.purchase_date_ms > v.purchase_date_ms) { return; }
							receipt = v;
						}
					});
					if(!receipt) { e = new Error('receipt not found'); e.code = '87202'; return cb(e); }
					gpid = receipt.product_id;
					// find payment plan
					var condition = {'gpid.iosiap': gpid, enable: true};
					self.db.collection('PaymentPlans').findOne(condition, {}, function (e1, d1) {
						if(e1) { e1.code = '01002'; return cb(e1); }
						else if(!d1) { e1 = new Error('Payment Plan not found'); e1.code = '39801'; return cb(e1); }
						else {
							ppid = d1._id.toString();
							type = d1.type;
							// make order
							var orderOptions = {
								uid: options.uid,
								ppid: ppid
							};
							if(!!options.pid) { orderOptions.pid = options.pid; }
							self.order(orderOptions, function (e2, d2) {
								if(e2) { cb(e2); }
								receipt.order = d2;
								if(type == 3) {
									var subscribeOPTS = {uid: options.uid, gateway: options.gateway, receipt: receipt};
									self.subscribe(subscribeOPTS, cb);
								}
								else {
									cb(null, receipt);
								}
							});
						}
					});
				}
			});

			break;
		case 'braintree':
		default:
			if(!options.ppid) { e = new Error('invalid order'); e.code = '19701'; return cb(e); }
			var pp = this.plans.find(function (v) {return v.ppid == options.ppid});
			if(pp.type == 3) {
				this.subscribe(options, cb);
			}
			else {
				this.gateway.transaction.sale({
					amount: options.fee.price,
					paymentMethodNonce: options.nonce,
					options: {
					  submitForSettlement: true
					}
				}, function (e, result) {
					if(e || !result.success) { e = new Error('payment failed'); e.code = '87201'; cb(e); }
					else {
						self.createBrainTreeID(options, function () {});
						cb(null, result);
					}
				});
			}
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
			if(!options.receipt || !isPlayable(paymentPlan.programs, options.pid)) {
				var e = new Error('failed to generate resource ticket'); e.code = '19901'; return cb(e);
			}
			ticket.programs = [options.pid];
			break;
		case 2:
			ticket.programs = paymentPlan.programs;
			break;
		case 3:
			ticket.enable = true;
			ticket.trial = options.trial;
			ticket.charge = options.charge;
			ticket.expire = options.charge + paymentPlan.ticket.expire;
			ticket.programs = [];
			ticket.subscribe = options.subscribe;
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

/* require: options.uid, options.gateway */
Bot.prototype.subscribe = function (options, cb) {
	var self = this;

	// check if already subscribe
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	var Tickets = this.db.collection('Tickets');
	var condition = {uid: options.uid, type: 3};
	Tickets.find(condition).toArray(function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(options.gateway != 'iosiap' && d.some(function (v) { return v.subscribe; })) {
			e = new Error('duplicate subscribe');
			e.code = '97002';
			return cb(e);
		}

		// caculate remain VIP duration
		var now = new Date().getTime();
		var trial = 0, expire = 0;
		var plus = d.reduce(function (pre, curr) {
			if(curr.trial > now && curr.trial > trial) { trial = curr.trial; }
			if(curr.expire > now && curr.expire > expire) { expire = curr.expire; }
			return (curr.expire - now) > pre? (curr.expire - now): pre;
		}, 0);
		if(d.length > 0 && plus == 0) {
			options.trial = {
				trialPeriod: false,
				trialDuration: 0
			};
		}
		else if(plus > 0) {
			options.trial = {
				trialPeriod: false,
				charge: expire
			};
			if(trial > 0) { options.trial.keep = trial; }
		}
		else {
			options.trial = {
				trialPeriod: (trialPeriod > 0),
				trialDuration: trialPeriod
			};
		}
		switch(options.gateway) {
			case 'iosiap':
				self.subscribeIOSIAP(options, cb);
				break;

			case 'braintree':
			default:
				self.subscribeBraintree(options, cb);
		}
	});
};

Bot.prototype.subscribeBraintree = function (options, cb) {
	var self = this;
	const ppid = options.ppid;
	const braintreePlan = this.plans.find(v => { return v.ppid == ppid }).gpid.braintree;
	this.getSubscribeOptions(options).then(function (subscribeDetail) {
		self.createBrainTreeID(options, function (e1, d1) {
			if(e1) { e1.code = '87201'; return cb(e1); }
			self.gateway.customer.find(d1, function(e2, customer) {
				if(e2) { e2.code = '87201'; return cb(e2); }
				else {
					self.gateway.paymentMethod.create({customerId: customer.id, paymentMethodNonce: options.nonce}, function (e3, d3) {
						if(e3) {e3.code = '87201'; return cb(e3); }
						else if(!d3.success) {
							e3 = new Error('payment failed');
							e3.code = '87201'; return cb(e3);
							/*
							logger.exception.warn('--- subscribe failed ---');
							logger.exception.warn(d3);
							var nextCharge = 0, trialPeriod = 0;
							var subscribeOptions = {
								paymentMethodToken: d3.paymentMethod.token,
								planId: "YearVIP"
							};
							options.trial = options.trial || {};
							if(options.trial.trialPeriod) {
								var duration = parseInt(options.trial.trialDuration / 86400 / 1000);
								duration = (duration > 0)? duration: 0;
								subscribeOptions.trialPeriod = (duration > 0);
								subscribeOptions.trialDuration = duration;

								nextCharge = new Date().getTime() + options.trial.trialDuration;
							}
							else if(options.trial.charge > 0) {
								subscribeOptions.trialPeriod = false;
								subscribeOptions.firstBillingDate = new Date(options.trial.charge).toJSON().split('T')[0];

								nextCharge = options.trial.charge;
							}
							else {
								subscribeOptions.trialPeriod = false;

								nextCharge = new Date().getTime();
							}
							self.gateway.transaction.sale({
								amount: options.fee.price,
								paymentMethodNonce: options.nonce,
								options: {
								  submitForSettlement: true
								}
							}, function (e, result) {
								if(e || !result.success) { e = new Error('payment failed'); e.code = '87201'; cb(e); }
								else {
									result._subscribe = '#once';
									result._charge = nextCharge;
									result._trial = options.trial.trialDuration > 0? nextCharge: options.trial.keep > 0? options.trial.keep: 0;
									cb(null, result);
								}
							});
							*/
						}
						else {
							var subscribeOptions = {
								paymentMethodToken: d3.paymentMethod.token,
								planId: braintreePlan
							};

							// member fee
							if(subscribeDetail.member || subscribeDetail.discount.indexOf("memberfree") > -1) {
								subscribeOptions.addOns = {remove: ['MemberFee']};
							}
							// annual discount
							if(subscribeDetail.discount.indexOf("rentfree") > -1) {
								subscribeOptions.discounts = {add: [ {inheritedFromId: 'MonarchExtraordinary'} ]};
							}
							// annual discount
							if(subscribeDetail.discount.indexOf("rent-4001") > -1) {
								subscribeOptions.discounts = {add: [ {inheritedFromId: 'rent-4001'} ]};
							}

							options.trial = options.trial || {};
							if(options.trial.trialPeriod) {
								var duration = parseInt(options.trial.trialDuration / 86400 / 1000);
								duration = (duration > 0)? duration: 0;
								subscribeOptions.trialPeriod = (duration > 0);
								if (duration > 0) subscribeOptions.trialDuration = duration;
							}
							else if(options.trial.charge > 0) {
								subscribeOptions.trialPeriod = false;
								subscribeOptions.firstBillingDate = new Date(options.trial.charge).toJSON().split('T')[0];
							}
							else {
								subscribeOptions.trialPeriod = false;
							}
							self.gateway.subscription.create(subscribeOptions, function (e4, d4) {
								if(e4) {
									e4.code = '87201';
									logger.exception.warn(e4);
									return cb(e4);
								}
								else if(!d4.success) {
									logger.exception.warn(d4);
									e4 = new Error('payment failed');
									e4.code = '87201';
									return cb(e4);
								}
								else {
									try {
										d4._subscribe = d4.subscription.id;
										d4._charge = new Date(d4.subscription.firstBillingDate).getTime();
										d4._trial = options.trial.trialDuration > 0? d4._charge: options.trial.keep > 0? options.trial.keep: 0;
									}
									catch(e5) {}
									return cb(null, d4);
								}
							});
						}
					});
				}
			});
		});
	}).catch(function (e) {
		cb(e);
	});
};
Bot.prototype.subscribeIOSIAP = function (options, cb) {
	var now = new Date().getTime();
	var receipt = options.receipt;
	receipt._subscribe = receipt.original_transaction_id;
	receipt._charge = options.trial.charge > now? options.trial.charge: now;
	receipt._trial = options.trial.trialDuration > 0? (now + options.trial.trialDuration): options.trial.keep > 0? options.trial.keep: 0;
	cb(null, receipt);
};

/* require: options.uid */
Bot.prototype.autoRenew = function (options, cb) {

};
Bot.prototype.manualRenew = function (options, cb) {
	cb(null, true);
}

/* require: options.uid */
Bot.prototype.cancelSubscribe = function (options, cb) {
	var self = this;
	var now = new Date().getTime();
	var collection = this.db.collection('Tickets');
	var condition = {uid: options.uid, type: 3, subscribe: {$ne: false}};
	collection.find(condition).toArray(function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		d.map(function (v) {
			var cond = {_id: v._id};
			var updateQuery = {$set: {subscribe: false}};
			if(v.trial > now) { updateQuery.$set.expire = v.trial; }
			else if(v.charge > now) { updateQuery.$set.expire = v.charge; }
			collection.findAndModify(cond, {}, updateQuery, {}, function () {});

			switch(v.gateway) {
				case 'iosiap':
					break;
				case 'braintree':
				default:
					self.gateway.subscription.cancel(v.subscribe, function (e2, d2) {});
			}
		});
		cb(null, true);
	});
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

Bot.prototype.isVIPProgram = function (pid) {
	return this.plans.some(function (v) {
		return (v.type == 3) && isPlayable(v.programs, pid);
	});
};

Bot.prototype.isVIPUser = function (uid, cb) {
	this.fetchSubscribeTickets({uids: [uid]}, function (e, d) {
		d = d || [{}];
		var now = new Date().getTime();
		cb(null, d.some(function (v) { return v.expire > now; }));
	})
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
	var self = this;

	// free program
	if(this.isFree(options)) { return cb(null, true); }
	else if(!textype.isObjectID(options.uid)) { return cb(null, false); }

	// check ticket
	var now = new Date().getTime();
	var collection = this.db.collection('Tickets');
	var condition = {uid: options.uid, expire: {$gt: now}, programs: {$in: [options.pid]}};
	collection.findOne(condition, {}, function (e, d) {
		if(!d) {
			if(self.isVIPProgram(options.pid)) {
				self.isVIPUser(options.uid, cb);
			}
			else {
				return cb(null, false);
			}
		}
		else { return cb(null, true); }
	});
};

/* require: options.uid, options.pid */
Bot.prototype.useTicketByProgram = function (options, cb) {
	var e = new Error('resource access denied'); e.code = '69201'; return cb(e);
};

/* do not require any input */
Bot.prototype.listPaymentPlans = function (options, cb) {
	var collection = this.db.collection("PaymentPlans");
	collection.find({type: 3, enable: true}, {programs: 0}).toArray(function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		d = descPaymentPlan(d);
		return cb(null, d);
	});
};

/* list Billing */
// require: uid
Bot.prototype.billingList = function (options, cb) {
	options = options || {};
	var self = this;
	var collection = this.db.collection("Orders");
	var condition = {uid: options.uid, receipt: {$exists: true}};
	collection.find(condition).toArray(function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		var pids = [];
		var bills = d1.map(function (v) {
			var bill = descBill(v);
			if(!!bill.pid) { pids.push(bill.pid); }
			var plan = self.plans.find(function(vv) { return vv.ppid == v.ppid; });
			if(plan) {
				bill.plan = {
					ppid: plan.ppid,
					title: plan.title
				};
			}
			return bill;
		});
		self.getBot('ResourceAgent').mergeByPrograms({pids: pids}, function (e2, d2) {
			if(e2) { return cb(e2); }
			bills.map(function (v, i) {
				var program = d2.find(function (vv) { return v.pid == vv.pid; });
				if(program) {
					bills[i].program = {
						pid: program.pid,
						title: program.title
					};
				}
			});
			cb(null, bills);
		});
	});
};

module.exports = Bot;
