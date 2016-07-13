const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const q = require('q');
const url = require('url');
const crypto = require('crypto');
const raid2x = require('raid2x');
const dvalue = require('dvalue');
const textype = require('textype');

var tokenLife = 86400000;
var renewLife = 8640000000;
var maxUser = 10;

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
		ctime: new Date().getTime(),
		ltime: 0,
		enable: false,
		status: 1
	});
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
		ctime: new Date().getTime(),
		ltime: 0,
		enable: false,
		status: 1
	});
	if(user.username.length == 0) { user.username = user.email; }
	delete user._id;
	delete user.password;
	return user;
};
var mergeCondition = function (user) {
	var condition;
	var profile = user.profile;
	switch(user.type) {
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
	this.mailHistory = {};
};

Bot.prototype.start = function (cb) {
	var self = this;
	Bot.super_.prototype.start.call(this);
};

Bot.prototype.addMailHistory = function (email) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.mailHistory[email] = dvalue.default(this.mailHistory[email], []);
	var t = this.mailHistory[email].reduce(function (pre, curr) {
		if(now - curr < 1800000) { pre++; }
		return pre;
	}, 0);
	this.mailHistory[email].map(function (v, i) {
		if(now - v > 1800000) {
			self.mailHistory[email].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.mailHistory[email].push(now); }

	return rs;
};

/* require: email, password(md5) */
/* optional: nickname */
/* 1: invalid e-mail, 2: account exist */
Bot.prototype.addUser = function (user, cb) {
	var self = this;
	user = formatUser(user);
	cb = dvalue.default(cb, function () {});
	if(!textype.isEmail(email)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		return cb(e);
	}

	// check exist -> throw exception
	// check to merge
	// no merge -> create new account
	// new account -> send mail

	// check exist
	var collection = this.db.collection('Users');
	collection.findOne({account: email, enable: true}, {}, function (e, d) {
		if(e) { return cb(e); }
		else if(!!d) {
			e = new Error("Occupied e-mail");
			e.code = '22001';
			return cb(e);
		}

		// create account
		collection.insert(user, {}, function (e1, d1) {
			if(e1) { return cb(e1); }
			else {
				cb(null, {uid: user._id});
			}
		});
	});
};
Bot.prototype.checkUserExist = function (condition) {
	var defer = new q.defer();
	var collection = this.db.collection('Users');
	collection.find(condition).toArray(function (e, d) {
		if(e) { defer.reject(e); }
		else { defer.resolve(d[0]); }
	});
	return defer.promise;
};
Bot.prototype.mergeUser = function (condition, profile) {
	var self = this;
	var collection = this.db.collection("Users");

	return self.checkUserExist(condition).then(function (v) {
		var defer = new q.defer();
		if(v) {
			// merge account with profile
			var cond = {_id: v._id}, set = {}, addToSet, updateQuery;
			for(var k in profile) {
				if(v[k] == undefined) {
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
			if(set.emails == undefined) { addSet(addToSet.emails, {$each: profile.emails}); }
			if(set.photos == undefined) { addSet(addToSet.photos, {$each: profile.photos}); }

			collection.findAndModify(cond, {}, updateQuery, {}, function (e, d) {
				if(e) { defer.reject(e); }
				else if(d.value) {
					defer.resolve(v);
				}
				else {
					defer.resolve(undefined);
				}
			});
		}
		else {
			// no account to merge
			defer.resolve(undefined);
		}
		return defer.promise;
	});
};

Bot.prototype.addUserBy3rdParty = function (USERPROFILE, cb) {
	var defer = new q.defer();
	var collection = this.db.collection('Users');
	USERPROFILE.enable = true;
	collection.insert(USERPROFILE, {}, function (e, d) {
		if(e) { defer.reject(e); }
		else { defer.resolve(USERPROFILE); }
	});

	return defer.promise;
};
Bot.prototype.getUserBy3rdParty = function (user, cb) {
	var self = this;
	var USERPROFILE = formatUser(user.profile);
	// check account existing
	// if account not exists, check mergeable account
	// if account still not exists, create one
	var condition = user.condition;
	var subCondition = mergeCondition(user);
	q.fcall(function () { return self.checkUserExist(condition); })
	 .then(function (v) { if(v) { var defer = new q.defer(); defer.resolve(v); return defer.promise; } else { return self.mergeUser(subCondition, USERPROFILE); }})
	 .then(function (v) { if(v) { var defer = new q.defer(); defer.resolve(v); return defer.promise; } else { return self.addUserBy3rdParty(USERPROFILE); }})
	 .then(function (v) {
			cb(null, v);
	  },
	  function (e) {
			cb(e);
		});
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
Bot.prototype.changePassword = function (user, cb) {
	if(typeof(user) != 'object' || user.uid !== undefined) {
		var e = new Error('Invalid data');
		e.code = -1;
		return cb(e);
	}
	var cond = {_id: user.uid, password: user.oldpassword};
	var updateQuery = {$set: {password: user.password}};
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

/* require: mail, password(md5) */
/* 1: not verify, 2: failed */
Bot.prototype.login = function (data, cb) {
	var self = this;
	var collection = this.db.collection('Users');
	var loginData = {account: (data.account || data.email), password: data.password};
	collection.findOne(loginData, {}, function (e, user) {
		if(e) { return cb(e); }
		else if(!user) {
			e = new Error("Login failed");
			e.code = 2;
			return cb(e);
		}
		if(!user.key) {
			e = new Error("Need to verify email address");
			e.code = 1;
			e.uid = user._id.toString();
			return cb(e);
		}
		else {
			self.createToken(user, cb);
		}
	});
};
/* create token by user id */
Bot.prototype.createToken = function (user, cb) {
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
			else if(!d) {
				e = new Error("invalid token");
				e.code = 1;
				return cb(e);
			}
			else if(now - d.create > renewLife) {
				e = new Error("overdue token");
				e.code = 2;
				return cb(e);
			}
			self.createToken({_id: d.uid}, cb);
		}
	)
};
/* token */
Bot.prototype.logout = function (token, cb) {
	this.destroyToken(token, function () {});
	cb(null);
};

/* reset password */
/* require: email */
Bot.prototype.resetPassword = function (email, cb) {
	var self = this;
	var collection = this.db.collection('Users');
	collection.findOne({account: email}, {}, function (e, user) {
		if(e) { return cb(e); }
		else if(!user) {
			e = new Error("email not found: " + email);
			e.code = 3;
			return cb(e);
		}
		else if(!user.key) {
			e = new Error("Need to verify email address");
			e.code = 1;
			e.uid = user._id.toString();
			return cb(e);
		}
		else {
			if(this.addMailHistory(email)) {
				var bot = self.getBot("Mailer");
				var password = dvalue.randomID(12);
				var encPassword = crypto.createHash('md5').update(password).update(':iSunCloud').digest('hex');
				var subject = 'iSunCloud - Reset Password'
				var content = dvalue.sprintf('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>iSunCloud</title></head><body style="margin: 0px;  font-family: Trebuchet MS, sans-serif, Helvetica, Microsoft JhengHei;  font-size: .8em;color: #332e3c;"><div style="width: 500px;margin: 10px auto;padding: 10px;border-radius: 5px;background: #E8DCB9;text-align: center;"><div style="font-size: 2em;text-align: center;">iSunCloud - forget password</div><div><div style="margin-top: 20px;">New Password:</div><div style="color: #885533;font-size: 1.5em;">%s</div></div></div></body></html>', password);
				bot.send(email, subject, content, function () {});
				collection.findAndModify(
					{_id: user._id},
					{},
					{$set: {password: encPassword}},
					{},
					function (e, d) {
						if(e) { return cb(e); }
						else {
							var rs = { uid: user._id.toString(), password: password };
							return cb(null, rs);
						}
					}
				);
			}
			else {
				var e = new Error("You have reached a limit for sending email: " + email);
				e.code = 2;
				return cb(e);
			}
		}
	});
};

/* change password */
/* require: uid, oldpassword, newpassword */
Bot.prototype.changePassword = function (options, cb) {
	options = dvalue.default(options, {
		uid: "",
		oldpassword: "",
		password: ""
	});
	var collection = this.db.collection('Users');
	var uid = options.uid;
	var oldpassword = options.oldpassword;
	var password = options.passwrod;
	collection.findAndModify(
		{_id: uid, password: oldpassword},
		{},
		{$set: {password: password}},
		{},
		function (e, d) {
			if(e) { return cb(e); }
			else if(!d) {
				e = new Error("password error");
				e.code = 1;
				return cb(e);
			}
			else {
				return cb();
			}
		}
	);
};

Bot.prototype.encryptPassword = function (password) {
	var salt = ":iSunCloud";
	var md5sum = crypto.createHash('md5');
	md5sum.update(password).update(salt);
	return md5sum.digest('hex');
};

module.exports = Bot;
