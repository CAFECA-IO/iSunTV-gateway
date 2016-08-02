const ParentBot = require('./_Bot.js');
const util = require('util');
const dvalue = require('dvalue');
const textype = require('textype');
const mongodb = require('mongodb');

var logger;

var formatComment = function (data) {
	var comment = dvalue.default(data, {
		uid: '',
		pid: '',
		title: '',
		comment: '',
		rating: 0,
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

/* require: options.uid ,options.pid
/* optional: options.rating, options.title, options.comment */
// 檢查 uid 並取得 User.verified 帶入 comment
// 一組 uid/pid 只能存在一則 comment, 若已存在則修改 title, comment, rating, verified 欄位並設定 mtime = atime = new Date().getTime()
// 若不存在則寫入值需經 formatComment function 處理
// 成功後回傳 cmid (= _id)
Bot.prototype.writeComment = function (options, cb) {
	// Verified optins
	if (typeof options.rating === 'string' ||
		(Math.floor(options.rating) < 1 && Math.floor(options.rating)) > 5){
		var e = new Error("Incorrect rating"); e.code = "19501"; return cb(e);
	}
	if (options.title.length > 100) { var e = new Error("Incorrect title"); e.code = "19502"; return cb(e); }
	if (options.comment.length > 1000) { var e = new Error("Incorrect comment"); e.code = "19503"; return cb(e); }
	options.rating = Math.floor(options.rating);

	var self = this;

	// Fetch user
	var usersCollection = self.db.collection('Users');
	var usersCond = {_id: new mongodb.ObjectID(options.uid)};
	usersCollection.findOne(usersCond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		if(!user){ e = new Error('User not found'); e.code = '39102'; cb(e); }

		// Fetch comment
		var commentsCollection = self.db.collection('Comments');
		var commentsCond = { uid: options.uid, pid: options.pid };
		commentsCollection.findOne(commentsCond, {}, function (e, foundComment) {
			if(e) { e.code = '01002'; return cb(e); }
			if(!foundComment){
				// Insert comment
				// 成功後回傳 cmid (= _id)
				commentsCollection.insertOne(formatComment(options), function(e, result){
					if(e) { e.code = '01002'; return cb(e); }
					if(!result.insertedId){ e = new Error('Comment not found'); e.code = '39501'; return cb(e); }
					cb(null, {cmid: result.insertedId})
				})
			}
			else {
				// Update comment
				// 成功後回傳 cmid (= _id)
				var commentSet = descComment(foundComment);
				commentSet.mtime = new Date().getTime();
				commentSet.atime = new Date().getTime();
				var cond = { _id: foundComment._id };
				var update = { $set: commentSet };
				commentsCollection.findAndModify(cond, {}, update, {}, function (e, d) {
					if(e) { e.code = '01002'; return cb(e); }
					if(!d.value){ e = new Error('Comment not found'); e.code = ''; return cb(e); }
					cb(null, {cmid: d.value._id})
				});
			}
		});
	});
};

/* require: options.cmid, options.uid */
// Comment.verified 設為 true
Bot.prototype.verifyComment = function (options, cb) {
	var collection = this.db.collection('Comments');
	var cond = { _id: new mongodb.ObjectID(options.cmid), uid: options.uid };
	var update = { $set: { verified: true } };
	collection.findAndModify(cond, {}, update, {}, function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		if(!d.value){ e = new Error('Comment not found'); e.code = ''; return cb(e); }
		cb(null, {cmid: d.value._id})
	});
};

/* require: options.uid, options.cmid */
// 檢查 uid 格式
// 檢查 cmid 格式
// 無回傳資料
// problem
Bot.prototype.deleteComment = function (options, cb) {
	if (!options.uid){ e = new Error(); e.code = 9527; return cb(e);}
	var self = this;

	// Fetch user
	var usersCollection = self.db.collection('Users');
	var usersCond = {_id: new mongodb.ObjectID(options.uid)};
	usersCollection.findOne(usersCond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		if(!user){ e = new Error('User not found'); e.code = '39102'; return cb(e); }

		// Delete comment
		var commentsCollection = self.db.collection('Comments');
		var commentsCond = { _id: new mongodb.ObjectID(options.cmid), uid: options.uid };
		commentsCollection.deleteOne(commentsCond, function (e, result) {
			console.log(result);
			if(e) { e.code = '01002'; return cb(e); }
			if(result.deletedCount === 0){ e = new Error('Comment not found'); e.code = '39102'; return cb(e); }
			cb(null, {});
		});
	});
};

/* require: options.pid */
/* optional: options.page, options.limit */
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
	var self = this;

	// List comments which user publish
	var commentsCollection = self.db.collection('Comments');
	var commentsCond = { pid: options.pid };
	var pageOpt = Number(options.page);
	var limitOpt = Number(options.limit);
	var skip = (pageOpt && pageOpt >= 1 ) ? (pageOpt - 1) * 7 : 0;
	var limit = (limitOpt && (limitOpt <= 7 || limitOpt > 0) ) ? limitOpt : 7;
	commentsCollection.find(commentsCond).skip(skip).limit(limit)
		.sort([['atime', 1]]).toArray(function (e, comments) {
		if(e) { e.code = '01002'; return cb(e); }

		// Init ret
		var ret = {
			pid: options.pid,
			average: 0,
			count: new Array(5).fill(0),
			comments: []
		};
		// fill count porperty
		for(var idx = 0, len = comments.length; idx < len ;idx++){
			var comment = comments[idx];
			var ratingIdx = comment.rating - 1;
			ret.count[ratingIdx] += 1;
			ret.comments.push(descComment(comment));
		}
		// fill average porperty
		ret.average = ret.count.reduce(function(prev, curr, idx){
			return prev + curr * (idx + 1)
		});

		// list data
		cb(null, ret);
	});
};

/* require: options.uid */
/* optional: options.pid, options.page, options.limit */
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
	var self = this;
	// Fetch user
	var usersCollection = self.db.collection('Users');
	var usersCond = {_id: new mongodb.ObjectID(options.uid)};
	usersCollection.findOne(usersCond, {}, function(e, user){
		if(e) { e.code = '01002'; return cb(e); }
		if(!user){ e = new Error('User not found'); e.code = '39102'; return cb(e); }

		// List user comments
		var commentsCollection = self.db.collection('Comments');
		var commentsCond = { uid: options.uid };
		if (options.pid) { commentsCond.pid = options.pid }
		var pageOpt = Number(options.page);
		var limitOpt = Number(options.limit);
		var skip = (pageOpt && pageOpt >= 1 ) ? (pageOpt - 1) * 7 : 0;
		var limit = (limitOpt && (limitOpt <= 7 || limitOpt > 0) ) ? limitOpt : 7;
		commentsCollection.find(commentsCond).skip(skip).limit(limit)
			.sort([['atime', -1]]).toArray(function (e, comments) {
			if(e) { e.code = '01002'; return cb(e); }

			//
			var ret = [];
			for(var idx = 0, len = comments.length; idx < len ;idx++){
				ret.push(descComment(comments[idx]));
			}
			cb(null, ret);
		});
	});
};

module.exports = Bot;
