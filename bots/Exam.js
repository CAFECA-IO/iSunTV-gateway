const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const dvalue = require('dvalue');

var logger;

var formatQuestion = function (data) {

};
var formatExam = function (data) {
//_id, email, questions, current, done, result
	var rs = {
		email: data.email,
		questions: data.questions,
		current: data.current || 0,
		done: !!data.done,
		result: !!data.result
	};
	return rs;
};
var descQuestion = function (data) {
	var rs = dvalue.clone(data);
	rs.exid = data._id.toString();
	dvalue.shuffle(rs.selection);
	delete rs._id;
	return rs;
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
Bot.prototype.getExamination = function (options, cb) {
	var self = this;
	var examinations = this.db.collection('Examinations');
	var condition = {email: options.email};
	examinations.findOne(condition, function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else if(d1) {
			if(!d1.done) {
				var q = d1.questions[d1.current];
				dvalue.shuffle(q.selection);
				q._id = d1._id;
				return cb(null, descQuestion(q));
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
			self.generateExamination(options, function (e2, d2) {
				if(e2) { return cb(e2); }
				else {
					var q = d2.questions[d2.current];
					dvalue.shuffle(q.selection);
					q._id = d2._id;
					return cb(null, descQuestion(q));
				}
			});
		}
	});
};
// require: email, name
Bot.prototype.generateExamination = function (options, cb) {
	var questions = this.db.collection('Questions');
	var examinations = this.db.collection('Examinations');
	questions.find({}).toArray(function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else {
			var q = formatExam({
				email: options.email,
				questions: JSON.parse(JSON.stringify(dvalue.randomPick(d1, 3)))
			});
			examinations.insertOne(q, function (e2, d2) {
				if(e2) {
					e2.code = '01001';
					cb(e2);
				}
				else {
					cb(null, q);
				}
			});
		}
	});
};
Bot.prototype.getQuestion = function (options, cb) {
	var examinations = this.db.collection('Examinations');
	var condition = {_id: new mongodb.ObjectID(options.exid)};
	examinations.findOne(condition, {}, function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else if(!d1) {
			e1 = new Error('examination not found');
			e1.code = '04301';
			return cb(e1);
		}
		else {
			var rs, q = d1.questions[d1.current];
			q._id = d1._id;
			rs = {
				finish: false,
				question: descQuestion(q)
			};
			return cb(null, rs);
		}
	});
};
// require: exid, answer
Bot.prototype.submitAnswer = function (options, cb) {
	var examinations = this.db.collection('Examinations');
	var condition = {_id: new mongodb.ObjectID(options.exid)};
	examinations.findOne(condition, {}, function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else if(!d1) {
			e1 = new Error('examination not found');
			e1.code = '04301';
			return cb(e1);
		}
		else {
			if(d1.questions[d1.current].selection[0] == options.answer) {
			// correct
				if(++d1.current < d1.questions.length) {
				// next question
					var rs, updateQuery, q = d1.questions[d1.current];
					q._id = d1._id;
					rs = {
						finish: false,
						question: descQuestion(q)
					};
					updateQuery = {$set: {
						current: d1.current
					}};
					examinations.findAndModify(condition, {}, updateQuery, {}, function (e2, d2) {
						if(e2) {
							e2.code = '01003';
							return cb(e2);
						}
						else {
							return cb(null, rs);
						}
					});
				}
				else {
				// done
					var updateQuery, rs;
					rs = {
						finish: true,
						question: undefined,
						invitation: dvalue.randomID(8)
					};
					updateQuery = {$set: {
						finish: true,
						result: true,
						invitation: rs.invitation
					}};
					examinations.findAndModify(condition, {}, updateQuery, {}, function (e2, d2) {
						if(e2) {
							e2.code = '01003';
							return cb(e2);
						}
						else {
							return cb(null, rs);
						}
					});
				}
			}
			else {
			// error
				e1 = new Error('examination failed');
				e1.code = '04801';
				updateQuery = {$set: {
					finish: true,
					result: false
				}};
				examinations.findAndModify(condition, {}, updateQuery, {}, function (e2, d2) {
					if(e2) {
						e2.code = '01003';
						return cb(e2);
					}
					else {
						return cb(e1);
					}
				});
			}
		}
	});
};

module.exports = Bot;