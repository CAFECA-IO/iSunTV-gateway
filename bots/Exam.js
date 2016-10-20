const ParentBot = require('./_Bot.js');
const util = require('util');
const dvalue = require('dvalue');

var logger;

var formatQuestion = function (data) {

};
var formatExam = function (data) {

};

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
	this.initQuestions();
};

Bot.prototype.initQuestions = function () {
	var questions = this.db.collection('Questions');
	questions.count({}, function (e, d) {
		if(d == 0) {
			var q = [];
			for(var i = 1; i <= 9; i++) {
				for(var j = 1; j <= 9; j++) {
					var qq = {
						question: dvalue.sprintf('%d x %d = ?', i, j),
						selection: [i * j, i * j * 2, i * j * 3]
					};
					q.push(qq);
				}
			}
			questions.insertMany(q, {}, function () {});
		}
	});
}

/*
_id, email, questions, current, done, result, invitation
 */

// require: email, name
Bot.prototype.getQuestions = function (options, cb) {
	var self = this;
	var examinations = this.db.collection('Examination');
	var condition = {email: options.email};
	examinations.findOne(condition, function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else if(d1) {
			if(!d1.done) {
				var q = d1.questions[d1.current];
				dvalue.shuffle(q.selection);
				q.exid = d1._id;
				return cb(null, q);
			}
			else if(d1.result) {
				e1 = new Error('already get invite code');
				e1.code = '04901';
				return cb(e1);
			}
			else {
				e1 = new Error('examination failed');
				e1.code = '04801';
				return cb(e1);
			}
		}
		else {
			self.generateExam(options, function (e2, d2) {
				if(e2) { return cb(e2); }
				else {
					var q = d2.questions[d2.current];
					dvalue.shuffle(q.selection);
					q.exid = d2._id;
					return cb(null, q);
				}
			});
		}
	});
};
// require: email, name
Bot.prototype.generateExam = function (options, cb) {
	var questions = this.db.collection('Questions');
	questions.find({}).toArray(function (e1, d1) {
		if(e1) { return cb(e1); }
		else {
			var q = formatExam({
				questions: dvalue.randomPick(d1, 3)
			});
		}
	});
};

Bot.prototype.submitAnswer = function (options, cb) {

};

module.exports = Bot;