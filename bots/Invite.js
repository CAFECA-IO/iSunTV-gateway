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
				{code: 'QEy9ZKrk', paymentPlan: {
					fee: {price: 300, currency: 'USD'},
					memberfee: {price: 100, currency: 'USD'},
					rentfee: {price: 200, currency: 'USD'},
				}, discount: []},
				{code: 'yQiCiKtn', paymentPlan: {
					fee: {price: 300, currency: 'USD'},
					memberfee: {price: 100, currency: 'USD'},
					rentfee: {price: 200, currency: 'USD'},
				}, discount: []}
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
			paymentPlan: {
				fee: {price: 300, currency: 'USD'},
				memberfee: {price: 100, currency: 'USD'},
				rentfee: {price: 200, currency: 'USD'},
			},
			discount: []
		};
		invitations.insert(invitation, {}, function (e2, d2) {
			if(e2) { e2.code = '01001'; cb(e2); return; }
			var subject = dvalue.sprintf('Welcome to iSunTV! - Invitation from %s', d1.username);
			var content = dvalue.sprintf(template, d1.username, code, code);
			self.getBot('Mailer').send(email, subject, content, function (e3, d3) {
				if(e3) { cb(e3); return; }
				else { cb(null, {}); return; }
			});
		});
	});
};


module.exports = Bot;