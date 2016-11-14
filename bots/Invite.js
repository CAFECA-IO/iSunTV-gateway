const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const dvalue = require('dvalue');
const textype = require('textype');

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
	this.initInvitation();
};

// android: QEy9ZKrk
// ios: yQiCiKtn
Bot.prototype.initInvitation = function () {
	var invitations = this.db.collection('Invitations');
	invitations.count({}, function (e, d) {
		if(d == 0) {
			var is = [
				{code: '8U5AZlNp', info: 'Web', discount: []},
				{code: 'QEy9ZKrk', info: 'Android', discount: []},
				{code: 'yQiCiKtn', info: 'iOS', discount: []},
				{code: 'eQuLJipCnIId', discount: ["memberfree"]},
				{code: 'kWp4KvKJ5AHn', discount: ["rentfree"]},
				{code: 'XEb79BSn8zlX', discount: ["memberfree", "rentfree"]}
			];
			invitations.insertMany(is, {}, function () {});
		}
	});
};

Bot.prototype.sendInvitation = function (options, cb) {
	var self = this;
	var email = options.email;
	var inviter = options.uid;
	if(!textype.isEmail(email)) {
		var e = new Error('Invalid email');
		e.code = '12001';
		cb(e);
		return;	
	}
	var code = dvalue.randomID(8);
	var template = this.getTemplate('mail_invitation.html');
	var inviterOptions = {uid: options.uid, skip_detail: true};
	var invitations = this.db.collection('Invitations');

	this.getBot('User').getProfile(inviterOptions, function (e1, d1) {
		if(e1) { cb(e1); return; }
		var invitation = {
			code: code,
			inviter: inviter,
			discount: []
		};
		invitations.insert(invitation, {}, function (e2, d2) {
			if(e2) { e2.code = '01001'; cb(e2); return; }
			var subject = dvalue.sprintf('Welcome to iSunTV! - Invitation from %s', d1.username);
			var content = dvalue.sprintf(template, d1.username, code, code);
			self.getBot('Mailer').send(email, subject, content, function (e3, d3) {});
			cb(null, {}); return;
		});
	});
};

Bot.prototype.checkInvitation = function (options, cb) {
	var self = this;
	var condition = {code: options.code};
	var invitations = this.db.collection('Invitations');
	invitations.findOne(condition, {_id: 0}, function (e1, d1) {
		if(e1) {
			e1.code = '01002'; cb(e1);
			return; 
		}
		else if(!d1) {
			e1 = new Error('invalid invitation code');
			e1.code = '10501';
			cb(e1);
			return;
		}
		else {
			cb(null, d1);
			return;
		}
	});
}

module.exports = Bot;