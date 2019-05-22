const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const fs = require('fs');
const q = require('q');
const url = require('url');
const path = require('path');
const crypto = require('crypto');
const raid2x = require('raid2x');
const dvalue = require('dvalue');
const textype = require('textype');
const jwt = require('jsonwebtoken')
const request = require('../utils/Crawler.js').request;
const AES = require('../utils/AES.js');

var tokenLife = 86400 * 1000;
var renewLife = 86400 * 100 * 1000;
var maxUser = 10;
var ResetLife = 86400000;
var historyPeriod = 1800000;
var requireEmailVerification = false;

var logger;
var APIURL;

var CRCTable = (function() {
	var c = 0, table = new Array(256);

	for(var n = 0; n != 256; ++n) {
		c = n;
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		table[n] = c;
	}

	return typeof Int32Array !== 'undefined' ? new Int32Array(table) : table;
})();
var CRC32 = function(buffer) {
	var b, crc, i, len, code;
	if(!Buffer.isBuffer(buffer)) { buffer = new Buffer(new String(buffer)); }
	if(buffer.length > 10000) return CRC32_8(buffer);

	for(var crc = -1, i = 0, len = buffer.length - 3; i < len;) {
		crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++])&0xFF];
		crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++])&0xFF];
		crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++])&0xFF];
		crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++])&0xFF];
	}
	while(i < len + 3) { crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++]) & 0xFF]; }
	code = (crc > 0? crc: crc * -1).toString(16);
	while(code.length < 8) { code = '0' + code; }
	return code;
};

var formatUser = function (user) {
	user = dvalue.default(user, {
		account: "",
		password: "",
		username: "",
		role: 1,
		email: "",
		photo: "",
		ctime: new Date().getTime(),
		ltime: 0,
		discount: user.discount || [],
		enable: true,
		verified: false,
		allowmail: false,
		status: 1
	});
	if(user.username.length == 0) {
		user.username = user.account.split('@')[0];
	}
	return user;
};
var descUser = function (user) {
	user.uid = user._id.toString();
	user = dvalue.default(user, {
		uid: "",
		account: "",
		username: "",
		role: 1,
		email: "",
		emails: [],
		photo: "",
		photos: [],
		ctime: new Date().getTime(),
		ltime: 0,
		discount: user.discount || [],
		enable: false,
		verified: false,
		allowmail: false,
		status: 1
	});
	if(!requireEmailVerification) { user.verified = true; }
	if(user.username.length == 0) { user.username = user.email; }
	if(user.email.length == 0 && user.emails.length > 0) { user.email = user.emails[0]; }
	if(user.photo.length == 0 && user.photos.length > 0) { user.photo = user.photos[0]; }
	if(user.photo.length == 0) { user.photo = url.resolve(APIURL, '/profile/' + user.uid + '/photo'); }
	user.password = user.password && user.password.length > 0;
	delete user._id;
	delete user.emails;
	delete user.photos;
	delete user.validcode;
	delete user.reset;
	delete user.facebook;
	return user;
};
var mergeCondition = function (user) {
	var condition;
	var profile = user.profile;
	switch(user.type) {
		case 'email':
			condition = {
				emails: {$in: [profile.email]},
				account: '',
				enable: true
			};
			break;
		default:
			condition = {
				email: {$in: profile.emails},
				facebook: {$exists: false}
			};
	}
	return condition;
};

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);
	logger = config.logger;
	APIURL = config.url;
	this.mailHistory = {};
	this.loginHistory = {};
	this.verifyHistory = {};
	this.resetHistory = {};
};

Bot.prototype.start = function (cb) {
	var self = this;
	Bot.super_.prototype.start.call(this);
};

Bot.prototype.addVerifyHistory = function (uid) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.verifyHistory[uid] = dvalue.default(this.verifyHistory[uid], []);
	var t = this.verifyHistory[uid].reduce(function (pre, curr) {
		if(now - curr < historyPeriod) { pre++; }
		return pre;
	}, 0);
	this.verifyHistory[uid].map(function (v, i) {
		if(now - v > historyPeriod) {
			self.verifyHistory[uid].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.verifyHistory[uid].push(now); }
	return rs;
};
Bot.prototype.cleanVerifyHistory = function (uid) {
	return this.verifyHistory[uid] = [];
};
Bot.prototype.addResetHistory = function (uid) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.resetHistory[uid] = dvalue.default(this.resetHistory[uid], []);
	var t = this.resetHistory[uid].reduce(function (pre, curr) {
		if(now - curr < historyPeriod) { pre++; }
		return pre;
	}, 0);
	this.resetHistory[uid].map(function (v, i) {
		if(now - v > historyPeriod) {
			self.resetHistory[uid].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.resetHistory[uid].push(now); }
	return rs;
};
Bot.prototype.cancelResetHistory = function (uid) {
	if(Array.isArray(this.resetHistory[uid])) {
		this.resetHistory[uid].pop();
	}
	return true;
};
Bot.prototype.cleanResetHistory = function (uid) {
	return this.resetHistory[uid] = [];
};
Bot.prototype.addLoginHistory = function (uid) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.loginHistory[uid] = dvalue.default(this.loginHistory[uid], []);
	var t = this.loginHistory[uid].reduce(function (pre, curr) {
		if(now - curr < historyPeriod) { pre++; }
		return pre;
	}, 0);
	this.loginHistory[uid].map(function (v, i) {
		if(now - v > historyPeriod) {
			self.loginHistory[uid].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.loginHistory[uid].push(now); }
	return rs;
};
Bot.prototype.cleanLoginHistory = function (uid) {
	return this.loginHistory[uid] = [];
};
Bot.prototype.addMailHistory = function (email) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.mailHistory[email] = dvalue.default(this.mailHistory[email], []);
	var t = this.mailHistory[email].reduce(function (pre, curr) {
		if(now - curr < historyPeriod) { pre++; }
		return pre;
	}, 0);
	this.mailHistory[email].map(function (v, i) {
		if(now - v > historyPeriod) {
			self.mailHistory[email].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.mailHistory[email].push(now); }
	return rs;
};

/* require: email, password(md5) */
/* optional: username */
/* 1: invalid e-mail, 2: account exist */
Bot.prototype.addUser = function (user, cb) {
	var self = this;
	var USERPROFILE = formatUser(user);
	var userdata = {type: 'email', profile: USERPROFILE};
	cb = dvalue.default(cb, function () {});
	if(!textype.isEmail(user.email)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		return cb(e);
	}

	// check to merge
	// no merge -> create user
	var condition = {account: user.account, enable: true};
	var subCondition = mergeCondition(userdata);
	/*
	q.fcall(function () { return self.mergeUser(subCondition, USERPROFILE); })
	 .then(function (v) { if(v) { return v; } else { return self.createUser(user); }})
	 */
	q.fcall(function () { return self.createUser(user); })
	 .then(function (v) {
		 var deferred = q.defer();
		 self.createToken(v, function (e, d) {
			 if(e) { deferred.reject(e); }
			 else { deferred.resolve(d); }
		 });
		 return deferred.promise;
	 })
	 .then(function (v) {
		  cb(null, v);
	  },
		function (e) {
			cb(e);
	  })
	 .done();
};
// require: email, password(md5), invitation
// optional: username
Bot.prototype.addUserWithInvitation = function (user, cb) {
	if(!this.config.requireInvitation) { return this.addUser(user, cb); }

	var self = this;
	var checkOPT = {code: user.invitation};
	this.getBot('Invite').checkInvitation(checkOPT, function (e1, d1) {
		if(e1) {
			cb(e1);
			return;
		}
		user.discount = d1.discount || [];
		self.addUser(user, cb);
	});
};
Bot.prototype.createUser = function (user) {
	var deferred = q.defer();
	var self = this;
	var condition = {account: user.email, enable: true};
	var USERPROFILE = formatUser(user);
	USERPROFILE.account = USERPROFILE.email;

	if(!textype.isEmail(user.email)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		deferred.reject(e);
	}
	// check exists
	// create account
	// send mail
	q.fcall(function () { return self.checkUserExist(condition); })
	 .then(function (v) {
		var subdeferred = q.defer();
		if(v) {
			var e = new Error("Occupied e-mail");
			e.code = '22001';
			subdeferred.reject(e);
		}
		else if(self.addMailHistory(user.email)) {
			var collection = self.db.collection('Users');
			USERPROFILE.validcode = dvalue.randomCode(6, {number: 1, lower: 0, upper: 0, symbol: 0});
			collection.insert(USERPROFILE, {}, function (e, d) {
				if(e) {
					e.code = '01001';
					subdeferred.reject(e);
				}
				else {
					subdeferred.resolve(USERPROFILE);
					var bot = self.getBot('Mailer');
					var opt = {email: user.email, validcode: USERPROFILE.validcode, uid: USERPROFILE._id.toString()};
					self.sendVericicationMail(opt, function () {});
				}
			});
		}
		else {
			var e = new Error("e-mail sending quota exceeded");
			e.code = '42001';
			subdeferred.reject(e);
		}
		return subdeferred.promise; })
		.then(deferred.resolve, deferred.reject)
		.done();
	return deferred.promise;
};
Bot.prototype.sendVericicationMail = function (options, cb) {
	var self = this;
	var bot = this.getBot('Mailer');
	var send;
	if(!textype.isEmail(options.email) && !textype.isObjectID(options.uid)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		return cb(e);
	}

	send = function (data) {
		if(self.addMailHistory(data.email)) {
			self.getBot('Payment').getSubscribeOptions(options).then(function (d) {
				var content, template = self.getTemplate('mail_signup.html');
				var tmp = url.parse(self.config.url);
				var uri = dvalue.sprintf('/register/%s/%s/redirect', data.email, data.validcode);
				var price = d.fee.currency + d.fee.price;
				tmp.pathname = path.join(tmp.pathname, uri);
				data.comfirmURL = url.format(tmp);
				content = dvalue.sprintf(template, price, data.email, data.comfirmURL, data.comfirmURL, data.validcode);
				bot.send(data.email, '歡迎來到 iSunTV 陽光網視', content, function (e, d) { if(e) { logger.exception.warn(e); }});
				cb(null, {});
			}).catch(function (e) {
				cb(e);
			});
		}
		else {
			var e = new Error('e-mail sending quota exceeded');
			e.code = '42001';
			cb(e);
		}
	}

	if(options.validcode) {
		send(options);
	}
	else {
		var condition;
		if(textype.isObjectID(options.uid)) { condition = {_id: new mongodb.ObjectID(options.uid), verified: {$ne: true}, validcode: {$exists: true}}; }
		else { condition = {account: options.email, verified: {$ne: true}, validcode: {$exists: true}}; }
		var collection = this.db.collection('Users');
		collection.findOne(condition, {}, function (e, d) {
			if(e) { e.code = '01002'; cb(e); }
			else if(!d) { e = new Error('User not found'); e.code = '39102'; cb(e); }
			else {
				if(!textype.isEmail(options.email)) { options.email = d.email; }
				options.validcode = d.validcode;
				options.username = d.username;
				send(options);
				self.cleanVerifyHistory(options.email);
			}
		});
	}
};
Bot.prototype.emailVerification = function (user, cb) {
	if(!this.addVerifyHistory(user.account)) { var e = new Error("verification failed too many times"); e.code = 40301; return cb(e); }
	var self = this;
	var condition = {account: user.account, validcode: user.validcode};
	var updateQuery = {$set: {verified: true}, $unset: {validcode: ""}};
	var collection = this.db.collection('Users');
	collection.findAndModify(condition, {}, updateQuery, {}, function (e, d) {
		if(e) { e.code = '01003'; cb(e); }
		else if(!d.value) { e = new Error('incorrect code'); e.code = '10301'; cb(e); }
		else {
			var notice = {
				uid: d.value._id.toString(),
				event: 'verify',
				data: {result: 1}
			};
			self.notice(notice, function () {});
			self.cleanVerifyHistory(user.account);
			self.cleanInvalidAccount(condition, function () {});
			self.createToken(d.value, cb);
		}
	});
};
Bot.prototype.cleanInvalidAccount = function (user, cb) {
	var collection = this.db.collection('Users');
	var condition = {account: user.account, enable: {$ne: true}};
	collection.remove(condition, cb);
};

Bot.prototype.getProfile = function (options, cb) {
	var self = this;
	var bot = this.getBot('Payment');
	var condition = {_id: new mongodb.ObjectID(options.uid)};
	var collection = this.db.collection('Users');
	collection.findOne(condition, {}, function (e, user) {
		if(e) { e.code = '01002'; cb(e); }
		else if(!user) { e = new Error('User not found'); e.code = '39102'; cb(e); }
		else if(!!options.skip_detail) {
			cb(null, user);
		}
		else {
			bot.fillVIPInformation(descUser(user), function (e1, d) {
				if(e) { cb(e1); }
				else { cb(null, d) }
			});
		}
	});
};

Bot.prototype.getUserPhoto = function (options, cb) {
	options = dvalue.default(options, {uid: 'default'});
	var f = path.join(this.config.path.profiles, options.uid);
	var defaultImg = fs.readFileSync('./resources/default_avatar.png');
	fs.readFile(f, function (e, d) {
		if(e) {
			cb(null, {mimetype: 'image/png', binary: defaultImg});
		}
		else {
			cb(null, {mimetype: 'image/png', binary: d});
		}
	});
};

Bot.prototype.accountRegistable = function (options, cb) {
	if(!textype.isEmail(options.account)) { var e = new Error('invalid email'); e.code = '12001'; return cb(e); }
	var self = this;
	var condition = {
		account: options.account,
		enable: true
	};
	q.fcall(function () {
		return self.checkUserExist(condition);
	}).then(function (d) {
		if(d) {
			var e = new Error('occupied email');
			e.code = '22001';
			cb(e);
		}
		else { cb(null, {}); }
	},
	function (e) { cb(e); });
};

Bot.prototype.checkUserExist = function (condition) {
	var deferred = q.defer();
	var collection = this.db.collection('Users');
	collection.find(condition).toArray(function (e, d) {
		if(e) { deferred.reject(e); }
		else { deferred.resolve(d[0]); }
	});
	return deferred.promise;
};
Bot.prototype.mergeUser = function (condition, profile) {
	var self = this;
	var collection = this.db.collection("Users");
	return self.checkUserExist(condition).then(function (v) {
		var deferred = q.defer();
		if(v) {
			// merge account with profile
			var cond = {_id: v._id}, set = {}, addToSet, updateQuery;
			for(var k in profile) {
				if(v[k] == undefined || v[k].length == 0) {
					set[k] = profile[k];
					v[k] = profile[k];
				}
			}
			updateQuery = {$set: set};
			var addSet = function (k, v) {
				if(addToSet == undefined) {
					addToSet = {};
					updateQuery['$addToSet'] = addToSet;
				}
				addToSet[k] = v;
			};
			if(set.emails == undefined && !!profile.emails) { addSet('emails', {$each: profile.emails}); }
			if(set.photos == undefined && !!profile.photos) { addSet('photos', {$each: profile.photos}); }

			collection.findAndModify(cond, {}, updateQuery, {}, function (e, d) {
				if(e) { deferred.reject(e); }
				else if(d.value) {
					deferred.resolve(v);
				}
				else {
					deferred.resolve(undefined);
				}
			});
		}
		else {
			// no account to merge
			deferred.resolve(undefined);
		}
		return deferred.promise;
	});
};

Bot.prototype.addUserBy3rdParty = function (USERPROFILE, cb) {
	var deferred = q.defer();
	var collection = this.db.collection('Users');
	collection.insert(USERPROFILE, {}, function (e, d) {
		if(e) { deferred.reject(e); }
		else { deferred.resolve(USERPROFILE); }
	});

	return deferred.promise;
};
Bot.prototype.getUserBy3rdParty = function (user, cb) {
	var self = this;
	var USERPROFILE = formatUser(user.profile);
	USERPROFILE.enable = true;
	USERPROFILE.verified = true;
	// check account existing
	// if account not exists, check mergeable account
	// if account still not exists, create one
	var condition = user.condition;
	var subCondition = mergeCondition(user);
	q.fcall(function () { return self.checkUserExist(condition); })
	// .then(function (v) { if(v) { return v; } else { return self.mergeUser(subCondition, USERPROFILE); }})
	 .then(function (v) { if(v) { return v; } else { return self.addUserBy3rdParty(USERPROFILE); }})
	 .then(function (v) {
			cb(null, v);
	  },
	  function (e) {
			cb(e);
		})
	 .done();
};

Bot.prototype.editUser = function (user, cb) {
	if(typeof(user) != 'object' || user.uid === undefined) {
		var e = new Error('Invalid data');
		e.code = -1;
		return cb(e);
	}
	var cond = {_id: user.uid, role: {$ne: 0}};
	var data = {};
	var dirty = false;
	if(typeof(user.username) == 'string' && user.username.length > 0) { dirty = true; data.username = user.username; }
	if(textype.isEmail(user.email)) { dirty = true; data.email = user.email; }
	if(typeof(user.password) == 'string' && user.password.length > 0) { dirty = true; data.password = user.password; }
	if(!dirty) { return cb(null, {}); }

	var collection = this.db.collection('Users');
	collection.findAndModify(
		cond,
		{},
		{$set: data},
		{},
		function (e, d) {
			if(e) { e.code = 0; return cb(e); }
			else if(!d) {
				e = new Error("user not found");
				e.code = 1;
				return cb(e);
			}
			else {
				return cb(null, {});
			}
		}
	);
};
Bot.prototype.lockUser = function (uid, cb) {
	var cond = {_id: uid, role: {$ne: 0}};
	var updateQuery = {$set: {status: -1}};
	var collection = this.db.collection('Users');
	collection.findAndModify(
		cond,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = 0; return cb(e); }
			else if(!d) {
				e = new Error("user not found");
				e.code = 1;
				return cb(e);
			}
			else {
				return cb(null, {});
			}
		}
	);
};
Bot.prototype.unlockUser = function (uid, cb) {
	var cond = {_id: uid, role: {$ne: 0}};
	var updateQuery = {$set: {status: 1}};
	var collection = this.db.collection('Users');
	collection.findAndModify(
		cond,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = 0; return cb(e); }
			else if(!d) {
				e = new Error("user not found");
				e.code = 1;
				return cb(e);
			}
			else {
				return cb(null, {});
			}
		}
	);
};
Bot.prototype.deleteUser = function (user, cb) {
	var cond = {_id: user.uid, account: user.account, role: {$ne: 0}};
	var collection = this.db.collection('Users');
	collection.remove(cond, function (e, d) {
		if(e) { e.code = 0; return cb(e); }
		else if(!d) {
			e = new Error("user not found");
			e.code = 1;
			return cb(e);
		}
		else {
			return cb(null, {});
		}
	});
};

Bot.prototype.getUserList = function () {
	return this.userlist;
};
Bot.prototype.listUser = function (cb) {
	cb = dvalue.default(cb, function () {});
	var self = this;
	var collection = this.db.collection('Users');
	collection.find({}).toArray(function (e, d) {
		if(e) {
			e.code = 0;
			cb(e);
		}
		else {
			var list = d.map(function (v) {
				return descUser(v);
			});
			cb(null, list);
		}
	});
};

/* require: options.uid */
Bot.prototype.updateLoginTime  = function (options, cb) {
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	var condition = {_id: new mongodb.ObjectID(options.uid), enable: true};
	var updateQuery = {$set: {ltime: new Date().getTime()}};
	var collection = this.db.collection('Users');
	collection.findAndModify(
		condition,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = '01001'; return cb(e); }
			else if(!d.value) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
			else { cb(null, {}); }
		}
	);
};

/* require: mail, password(md5) */
/* 1: not verify, 2: failed */
Bot.prototype.login = function (data, cb) {
	if(!this.addLoginHistory(data.account)) { var e = new Error("login failed too many times"); e.code = 49101; return cb(e); }
	var self = this;
	var collection = this.db.collection('Users');
	var loginData = {account: data.account, password: data.password};
	collection.findOne(loginData, {}, function (e, user) {
		if(e) { return cb(e); }
		else if(!user) {
			e = new Error("incorrect account/password");
			e.code = '19101';
			return cb(e);
		}
		if(!user.enable) {
			e = new Error("Account not verified");
			e.code = '69101';
			e.uid = user._id.toString();
			return cb(e);
		}
		else {
			self.cleanLoginHistory(data.account);
			self.createToken(user, cb);
		}
	});
};
/* create token by user id */
Bot.prototype.createToken = function (user, cb) {
	var self = this;
	if(user._id === undefined) {
		var e = new Error('Invalid User Account');
		e.code = '19101'
		return cb(e);
	}
	var now = new Date().getTime();
	var collection = this.db.collection('Tokens');
	var tbody = dvalue.randomID(24);
	var tcrc = CRC32(tbody);
	var token = {
		_id: new mongodb.ObjectID().toString(),
		uid: user._id,
		token: tbody + tcrc,
		renew: dvalue.randomID(8),
		create: now
	};
	collection.insert(token, {}, function (e, d) {
		delete token._id;
		self.updateLoginTime(token, function () {});
		return cb(e, token);
	});
};
Bot.prototype.checkToken = function (token, cb) {
	if(typeof(token) != 'string' || token.length != 32) { return cb(); }
	var tbody = token.substr(0, 24);
	var tcrc = token.substr(24);
	if(CRC32(tbody) != tcrc) { return cb(); }

	var limit = new Date().getTime() - tokenLife;
	var collection = this.db.collection('Tokens');
	collection.findOne({token: token, create: {$gt: limit}, destroy: {$exists: false}}, {}, function (e, user) {
		if(e) { return cb(e); }
		var user = user || {};
		if(user.uid) { user.uid = user.uid.toString(); }
		cb(null, user);
	});
};
Bot.prototype.destroyToken = function (token, cb) {
	var now = new Date().getTime();
	var collection = this.db.collection('Tokens');
	collection.findAndModify(
		{token: token, destroy: {$exists: false}},
		{},
		{$set: {destroy: now}},
		{},
		cb
	);
};

/* require: token.token, token.renew */
/* 1: invalid token, 2: overdue */
Bot.prototype.renew = function (token, cb) {
	var self = this;
	var code = token.token;
	var renew = token.renew;
	var now = new Date().getTime();
	var collection = this.db.collection('Tokens');
	collection.findAndModify(
		{token: code, renew: renew, destroy: {$exists: false}},
		{},
		{$set: {destroy: now}},
		{},
		function (e, d) {
			if(e) { return cb(e); }
			else if(!d.value) {
				e = new Error("invalid token");
				e.code = '10201';
				return cb(e);
			}
			else if(now - d.value.create > renewLife) {
				e = new Error("overdue token");
				e.code = '70201';
				return cb(e);
			}
			self.createToken({_id: d.value.uid}, cb);
		}
	)
};
/* token */
Bot.prototype.logout = function (token, cb) {
	this.destroyToken(token, function () {});
	cb(null);
};

/* forget password */
/* require: user.email */
Bot.prototype.forgetPassword = function (user, cb) {
	var self = this;
	if(!textype.isEmail(user.email)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		return cb(e);
	}
	var create = new Date().getTime();
	var code = dvalue.randomCode(6, {number: 1, lower: 0, upper: 0, symbol: 0});
	var json = { code: code, create: create };
	var updateQuery = {$set: {reset: json}};
	var collection = this.db.collection('Users');
	var cond = {account: user.email, enable: true};
	collection.findAndModify(
		cond,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = '01002' ; return cb(e); }
			else if(!d.value) {
				e = new Error('User not found');
				e.code = '39102';
				cb(e);
			}
			else {
				if(self.addMailHistory(d.value.email)){
					var bot = self.getBot('Mailer');
					var template = self.getTemplate('mail_pw_reset.html');
					var lang = new String(user.language[0] || "").toLowerCase();
					var langList = ["zh", "cn"];
					var language = langList.find(function (v) { return new RegExp(v).test(lang); }) || "zh";
					var resetUrl = dvalue.sprintf(url.resolve(self.config.frontend, '/%s/updatePassword?resetcode=%s&uid=%s'), language, code, d.value._id);
					var content = dvalue.sprintf(template, user.email, resetUrl, code);
					bot.send(user.email, 'Welcome to iSunTV - Forget password', content, function () {});
					cb(null, { uid:d.value._id });
				}
				else{
					e = new Error('e-mail sending quota exceeded');
					e.code = '42001';
					cb(e);
				}
			}
		}
	);
};

/* check reset password code */
/* require: options.resetcode, options.uid */
Bot.prototype.checkResetPassword = function (options, cb) {
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	if(!this.addResetHistory(options.uid)) { var e = new Error("reset failed too many times"); e.code = 49102; return cb(e); }
	var self = this;
	var cond = {
		_id: new mongodb.ObjectID(options.uid),
		'reset.code': options.resetcode,
		'reset.create': {$gt: new Date().getTime() - ResetLife},
		enable: true,
	};
	var collection = this.db.collection('Users');
	collection.findOne(cond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!user) {
			e = new Error("invalid reset code");
			e.code = '19104';
			return cb(e);
		}
		else {
			self.cleanResetHistory(options.uid);
			return cb(null, {});
		}
	});
};

/* reset password */
/* require: options.resetcode, options.password, options.uid */
Bot.prototype.resetPassword = function (options, cb) {
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	if(!this.addResetHistory(options.uid)) { var e = new Error("reset failed too many times"); e.code = 49102; return cb(e); }
	var self = this;
	var cond = {
		_id: new mongodb.ObjectID(options.uid),
		'reset.code': options.resetcode,
		'reset.create': {$gt: new Date().getTime() - ResetLife},
		enable: true,
	};
	var collection = this.db.collection('Users');
	collection.findOne(cond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!user) {
			e = new Error("invalid reset code");
			e.code = '19104';
			return cb(e);
		}
		else if (user.password == options.password) {
			self.cancelResetHistory(options.uid);
			e = new Error("duplicate password");
			e.code = '29101';
			return cb(e);
		}
		else {
			var updateQuery = {$set: {password: options.password}, $unset: {reset: ''}};
			collection.findAndModify(
				cond,
				{},
				updateQuery,
				{},
				function (e, d) {
					if(e) { e.code = '01002'; return cb(e); }
					else if(!d.value) {
						e = new Error("invalid reset code");
						e.code = '19104';
						return cb(e);
					}
					else {
						self.cleanResetHistory(options.uid);
						self.cleanLoginHistory(d.value.account);
						return cb(null, {});
					}
				}
			);
		}
	});
};

/* change password */
/* require: user.uid, user.password_old, user.password_new */
Bot.prototype.changePassword = function (user, cb) {
	if(typeof(user) != 'object' || user.uid == undefined) {
		var e = new Error('Invalid user data');
		e.code = '19102';
		return cb(e);
	}
	var self = this;
	var cond = {_id: new mongodb.ObjectID(user.uid), password: user.password_old};
	var updateQuery = {$set: {password: user.password_new}};
	var collection = this.db.collection('Users');
	collection.findOne(cond, {}, function (e1, d1) {
		if(e1) {
			e1.code = '01002';
			return cb(e);
		}
		else if(!d1) {
			e1 = new Error("incorrect old password");
			e1.code = '19103';
			return cb(e1);
		}
		else if (user.password_old === user.password_new) {
			e1 = new Error('duplicate password');
			e1.code = '29101';
			return cb(e1);
		}
		collection.findAndModify(
			cond,
			{},
			updateQuery,
			{},
			function (e, d) {
				if(e) { e.code = '01003'; return cb(e); }
				else if(!d.value) {
					e = new Error("incorrect old password");
					e.code = '19103';
					return cb(e);
				}
				else {
					var template = self.getTemplate('mail_change_password.html');
					var subject = 'iSunTV - password has been changed';
					var content = template;
					self.getBot("Mailer").send(d.value.email, subject, content, function () {});
					return cb(null, {});
				}
			}
		);
	});
};

/* fetch User data */
/* require: options.uids */
Bot.prototype.fetchUsers = function (options, cb) {
	var collection = this.db.collection('Users');
	var uids = options.uids.map(mongodb.ObjectID);
	var condition = {_id: {$in: uids}};
	collection.find(condition).toArray(function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		d = d || [];
		var users = d.map(function (v) {
			var rs = descUser(v);
			return {uid: v.uid, username: v.username, photo: v.photo};
		});
		cb(null, users);
	});
};

/* Update Profile */
/* require: options.uid */
/* options: options.username, options.photo */
Bot.prototype.updateProfile = function (options, cb){
	var self = this;
	var setFields = {};
	options.username && (setFields.username = options.username);
	// check photo
	if (options.photo) {
		if (options.photo.mimetype.split("/")[0] !== 'image') {
			e = new Error('incorrect image type'); e.code = '19105'; cb(e);
		}
		setFields.photo = url.resolve(this.config.url, dvalue.sprintf('/profile/%s/photo', options.uid));
		var oldPath = options.photo.path;
		var newPath = path.join(this.config.path.profiles, options.uid);
		fs.rename(oldPath, newPath)
	}

	// Update the fields
	var collection = self.db.collection('Users');
	var condition = { _id: new mongodb.ObjectID(options.uid), enable: true };
	var update = { $set: setFields };
	collection.findAndModify(condition, {}, update, {}, function (e, d) {
		if(e) { e.code = '01003'; return cb(e); }
		else if(!d.value) { e = new Error('incorrect code'); e.code = '39101'; cb(e); }
		else {
			cb(null, {})
		}
	});
}

Bot.prototype.encryptPassword = function (password) {
	var salt = ":iSunCloud";
	var md5sum = crypto.createHash('md5');
	md5sum.update(password).update(salt);
	return md5sum.digest('hex');
};

// require: uid, event, data
Bot.prototype.notice = function (options, cb) {
	var reqopts;
	var noticeURL = url.resolve(this.config.notice, '/notice/%s/%s');
	noticeURL = dvalue.sprintf(noticeURL, options.uid, options.event);
	reqopts = url.parse(noticeURL);
	reqopts.method = 'POST';
	reqopts.datatype = 'json';
	reqopts.post = options.data;
	reqopts.headers = {'Content-Type': 'application/json'};
	request(reqopts, cb);
};

// require: token
// optional: page, limit
Bot.prototype.listUserActivities = function (options) {
	var db = this.db;
	var exams, invis, users, pays;
	var page = parseInt(options.page) || 1;
	var limit = parseInt(options.limit) || 20;
	var promise = new Promise(function (resolve, reject) {
		if(options.token != 'Jmeqx9p0N1ELeTgifwGOOpZe') {
			var e = new Error('invalid token');
			e.code = '10201';
			return reject(e);
		}
		var exams, invis, users, pays;
		var examC = db.collection('Examinations');
		var inviC = db.collection('Invitations');
		var userC = db.collection('Users');
		var ordeC = db.collection('Orders');
		Promise.all([examC.find({}).toArray(), inviC.find({}).toArray(), userC.find({}).toArray(), ordeC.find({}).toArray()]).then(values => {
			exams = values[0];
			invis = values[1];
			users = values[2];
			orders = values[3];
			var activities = [];
			exams.map(function (v) {
				activities.push({email: v.email, passed_question: v.result, invitation_code: v.invitation, timestamp: new Date(v._id.getTimestamp()).getTime()});
			});
			invis.map(function (v) {
				v.iid = v._id.toString();
				if(!!v.inviter) {
					var inv = users.find(function (u) {
						return u._id.toString() == v.inviter;
					});
					activities.push({invitation_code: v.code, who_invite: inv.email, timestamp: new Date(v._id.getTimestamp()).getTime()});
				}
				else if(v.info) {
					activities.push({invitation_code: v.code, who_invite: 'iSunTV', timestamp: new Date(v._id.getTimestamp()).getTime()});
				}
				else if(v.discount.length > 0) {
					activities.push({invitation_code: v.code, who_invite: 'iSunTV', timestamp: new Date(v._id.getTimestamp()).getTime()});
				}
			});
			users.map(function (v) {
				var code = v.invitation;
				var ev = activities.find(function (vv) { return vv.invitation_code == code; });
				if(ev) {
					ev.uid = v._id.toString();
					ev.email = v.email;
					ev.name = v.username;
					ev.timestamp = v.ltime;
					ev.campaign_url = 'https://www.isuntv.com/signin';
				}
			});
			orders.map(function (v) {
				var ev = activities.find(function (vv) { return vv.uid == v.uid; });
				if(ev) {
					if(ev.stay_in_payment_page == undefined) { ev.stay_in_payment_page = true; }
					if(v.receipt) {
						ev.stay_in_payment_page = false;
						ev.payment_method = v.receipt.gateway;
					}
				}
			});
			var start = (page - 1) * limit;
			var end = start + limit;
			resolve(activities.slice(start, end));
		}).catch(function (e) {
			e.code = '01002';
			reject(e);
		});
	});
	return promise;
};

Bot.prototype.getIsunoneJWT = function (options, cb) {
	var self = this;
	if(!options.token) { 
		var e = new Error("Invalid token");
		return cb(e);
	};
	
	const JWTdecoded = jwt.decode(options.token);
	const data = AES.Decrypt(JWTdecoded.data);
	
	q.fcall(function () {
		return self.checkUserExist({ 
			account: data.isunone.username, 
			'isunone.binddata.isunone.linkage_id': data.isunone.linkage_id,
			enable: true, 
		});
	}).then(function (d) {
		if(!d) {
			e = new Error("incorrect account/password");
			e.code = '19101';
			return cb(e);
		}
		if(!d.enable) {
			e = new Error("Account not verified");
			e.code = '69101';
			e.uid = d._id.toString();
			return cb(e);
		}
		self.cleanLoginHistory(d.account);
		self.createToken(d, cb);
	});
}

Bot.prototype.createIsunoneUser = function (options, cb) {
	var self = this;
	if(!options.token) { 
		return cb(400, {
			"status": false,
			"code": "OTHER_EXCEPTION",
		});
	};
	
	let JWTdecoded, data, collection
	try {
		JWTdecoded = jwt.decode(options.token);
		data = AES.Decrypt(JWTdecoded.data);
		collection = this.db.collection('UnitID');
	} catch (error) {
		return cb(400, {
			"status": false,
			"code": "OTHER_EXCEPTION",
		});
	}
	
	// 1. create a user record
	//   check user is exit
	q.fcall(function () {
		return self.checkUserExist({ 
			account: data.isunone.username, 
			'isunone.binddata.isunone.linkage_id': data.isunone.linkage_id,
			enable: true, 
		});
	}).then(function (d) {
		if(d) {
			return cb(400, {
				"status": false,
				"code": "EXIST_LINKAGE_OR_USER",
			});
		}
		//   generate a random password and use platform_username as your user record unique id, e.g. email for tidebit

		//   get LinkageID from UnitIDTable
		//   findAndModify LinkageID in UnitIDTable
		

		collection.findAndModify( { "key": "isunoneLinkageID" }, null, { $inc: { value: 1 } }, { new: true, upsert: true }, function(err, result){
			if (err) {
				return cb(400, {
					"status": false,
					"code": "OTHER_EXCEPTION",
				});
			}
			
			// 2. create link_accounts record
			let linkageID = result.value.value
			var user = {
				condition: {
					account: data.isunone.username,
					'isunone.binddata.isunone.linkage_id': data.isunone.linkage_id,
					enable: true, 
				},
				profile: {
					account: data.isunone.username,
					username: data.isunone.username,
					email: data.isunone.email || "default@isunone.com",
					emails: [data.isunone.email|| "default@isunone.com"],
					photo: "",
					photos: [],
					allowmail: false,
					isunone: {
						status: "approved",
						isuntv_linkage_id: linkageID,
						binddata: data,
					},
				}
			};
			
			self.getUserBy3rdParty(user, function (err, result) {
				if (err) {
					return cb(400, {
						"status": false,
						"code": "CREATE_USER_FAIL",
					});
				}
			});

			// 3. respond to isunone
			return cb(200, {
				"status": true,
				"data": {
					"platform": {
						"name":      "rockme",
						"linkage_id": linkageID,
					},
					"isunone": {
						"linkage_id": data.isunone.linkage_id,
					},
				},
			});
		});
	});
}

module.exports = Bot;
