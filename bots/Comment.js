const ParentBot = require('./_Bot.js');
const util = require('util');
const dvalue = require('dvalue');
const textype = require('textype');

var logger;

var formatComment = function (data) {
	var comment = dvalue(data, {
		uid: '',
		pid: '',
		title: '',
		comment: '',
		rating: 0,
		verified: false,
		ctime: new Date().getTime(),
		mtime: undefined,
		atime: new Date().getTime()
	});
	return comment;
};
var descComment = function (data) {
	var comment = {
		uid: data.uid,
		pid: data.pid,
		title: data.title,
		comment: data.comment,
		ctime: data.ctime,
		mtime: data.mtime
	};
	return comment;
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

};

/* require: options.uid, options.pid, options.rating, options.title, options.comment */
// 檢查 uid 並取得 User.verified 帶入 comment
// 一組 uid/pid 只能存在一則 comment, 若已存在則修改 title, comment, rating, verified 欄位並設定 mtime = atime = new Date().getTime()
// 若不存在則寫入值需經 formatComment function 處理
// 成功後回傳 cmid (= _id)
Bot.prototype.writeComment = function (options, cb) {
	if (!options.uid){ e = new Error(); e.code = 9527; return cb(e);}

	// Fetch user
	var usersCollection = this.db.collection('Users');
	var usersCond = {_id: new mongodb.ObjectID(options.uid)};
	usersCollection.findOne(usersCond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }

		// Fetch comment
		var commentsCollection = this.db.collection('Comments');
		var commentsCond = { uid: options.uid, pid: options.pid };
		commentsCollection.findOne(usersCond, {}, function (e, comment) {
			if(e) { e.code = '01002'; return cb(e); }
			if(!comment){
				// Insert comment
				// 成功後回傳 cmid (= _id)
			}
			else {
				// update comment
				// 成功後回傳 cmid (= _id)
			}
		});
	});
};

/* require: options.cmid */
// Comment.verified 設為 true
Bot.prototype.verifyComment = function (options, cb) {
	var collection = this.db.collection('Comments');
	var cond = { uid: options.uid, pid: options.pid };
	var update = {}
	collection.findOne(cond, update, function (e, comment) {
		if(e) { e.code = '01002'; return cb(e); }
		if(!comment){
			// not found comment
		}
		// update
	}
};

/* require: options.uid, options.cmid */
// 檢查 uid 格式
// 檢查 cmid 格式
// 無回傳資料
// problem
Bot.prototype.deleteComment = function (options, cb) {
	if (!options.uid){ e = new Error(); e.code = 9527; return cb(e);}

	// Fetch user
	var usersCollection = this.db.collection('Users');
	var usersCond = {_id: new mongodb.ObjectID(options.uid)};
	usersCollection.findOne(usersCond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }

		// delete comment
		var commentsCollection = this.db.collection('Comments');
		var commentsCond = {
			_id: new mongodb.ObjectID(options.cmid),
			uid: options.uid,
		};
		commentsCollection.deleteOne(commentsCond, function (e, comment) {
			if(e) { e.code = '01002'; return cb(e); }
			if(!comment){
			}

			cb(null, {});
		});
	});
};

/* require: options.pid */
/* optional: options.uid, options.page, options.limit */
// 檢查 pid 格式 (X)
// 檢查 uid 格式
// 搜尋 Comment
// order by atime 由新到舊
// 回傳資料須經由 descComment function 處理

/* 回傳資料
{
	pid: {$pid},
	average: 平均分數,
	count: [1星人數, 2星人數, 3星人數, 4星人數, 5星人數],
	comments: [
		{$comment},
		{$comment},
		...
	]
}
 */
Bot.prototype.listProgramComments = function (options, cb) {
	var collection = this.db.collection('Comments');
	var cond = {
		pid: new mongodb.ObjectID(options.cmid),
		uid: options.uid,
		page: options.page,
		limit: options.limit,
	};
	collection.find(cond, function (e, comments) {
		if(e) { e.code = '01002'; return cb(e); }
		if(!comments){
		}

		// list data
		cb(null, {});
	});
};

/* optional: options.uid */
/* require: options.pid, options.page, options.limit */
// 檢查 pid 格式
// 檢查 uid 格式
// 搜尋 Comment
// order by atime 由新到舊
// 回傳資料須經由 descComment function 處理
/* 回傳資料
[
	{$comment},
	{$comment},
	...
]
*/
Bot.prototype.listUserComments = function (options, cb) {

	var collection = this.db.collection('Comments');
	var cond = {
		pid: new mongodb.ObjectID(options.cmid),
		uid: options.uid,
		page: options.page,
		limit: options.limit,
	};
	collection.find(cond, function (e, comments) {
		if(e) { e.code = '01002'; return cb(e); }
		if(!comments){
		}

		// list data
		cb(null, {});
	});

};

module.exports = Bot;
