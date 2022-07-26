const ParentBot = require('./_Bot.js');
const util = require('util');
const dvalue = require('dvalue');
const textype = require('textype');
const mongodb = require('mongodb');

var logger;

var formatComment = function (data) {
	if(Array.isArray(data)) { return data.map(formatComment); }
	var now = new Date().getTime();
	var comment = dvalue.default(data, {
		uid: '',
		pid: '',
		title: '',
		comment: '',
		rating: 0,
		verified: false,
		ctime: now,
		mtime: now,
		atime: now
	});
	return comment;
};
var descComment = function (data) {
	if(Array.isArray(data)) { return data.map(descComment); }
	var comment = {
		cmid: data._id.toString(),
		user: data.user,
		program: data.program,
		rating: data.rating,
		title: data.title,
		comment: data.comment,
		ctime: data.ctime || 0,
		mtime: data.mtime || 0,
		atime: data.atime || 0
	};
	return comment;
};
var validRating = function (rating) {
	rating = parseInt(rating);
	return (rating >= 1 && rating <= 5)? rating: 1;
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
	var self = this;
	if (typeof options.rating === 'string' ||
		(Math.floor(options.rating) < 1 && Math.floor(options.rating)) > 5){
		var e = new Error("Incorrect rating"); e.code = "19501"; return cb(e);
	}
	if (options.title.length > 30) { var e = new Error("Incorrect title"); e.code = "19502"; return cb(e); }
	if (options.comment.length > 500) { var e = new Error("Incorrect comment"); e.code = "19503"; return cb(e); }
	if (!(/^[se][0-9]+/.test(options.pid))) { var e = new Error("Program not found"); e.code = "39201"; return cb(e); }
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
				var bot = self.getBot('ResourceAgent');
				bot.getProgram({pid: options.pid}, function (e, d) {
					options.program = d;
					commentsCollection.insertOne(formatComment(options), function(e, result){
						if(e) { e.code = '01002'; return cb(e); }
						if(!result.insertedId){ e = new Error('Comment not found'); e.code = '39501'; return cb(e); }
						cb(null, {cmid: result.insertedId})
					})
				});
			}
			else {
				// Update comment
				// 成功後回傳 cmid (= _id)
				var commentSet = formatComment(foundComment);
				commentSet.rating = options.rating;
				commentSet.title = options.title;
				commentSet.comment = options.comment;
				commentSet.mtime = new Date().getTime();
				commentSet.atime = new Date().getTime();
				var cond = { _id: foundComment._id };
				var update = { $set: commentSet };
				var bot = self.getBot('ResourceAgent');
				bot.getProgram({pid: options.pid}, function (e, d) {
					commentSet.program = d;
					commentsCollection.findAndModify(cond, {}, update, {}, function (e, d) {
						if(e) { e.code = '01002'; return cb(e); }
						if(!d.value){ e = new Error('Comment not found'); e.code = ''; return cb(e); }
						cb(null, {cmid: d.value._id})
					});
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

/* require: options.uid, options.pid */
// 檢查 uid 格式
// 無回傳資料
// problem
Bot.prototype.deleteCommentByPID = function (options, cb) {
	if (!options.uid){ e = new Error('User not found'); e.code = '39102'; return cb(e); }
	var self = this;

	// Fetch user
	var usersCollection = self.db.collection('Users');
	var usersCond = {_id: new mongodb.ObjectID(options.uid)};
	usersCollection.findOne(usersCond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		if(!user){ e = new Error('User not found'); e.code = '39102'; return cb(e); }

		// Delete comment
		var commentsCollection = self.db.collection('Comments');
		var commentsCond = { pid: options.pid, uid: options.uid };
		commentsCollection.deleteOne(commentsCond, function (e, result) {
			if(e) { e.code = '01002'; return cb(e); }
			if(result.deletedCount === 0) { e = new Error('Comment not found'); e.code = '39102'; return cb(e); }
			cb(null, {});
		});
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
			if(e) { e.code = '01002'; return cb(e); }
			if(result.deletedCount === 0){ e = new Error('Comment not found'); e.code = '39102'; return cb(e); }
			cb(null, {});
		});
	});
};

/* require: options.pid */
/* optional: options.uid, options.page, options.limit */
Bot.prototype.summaryProgramComments = function (options, cb) {
	var self = this;
	var collection = this.db.collection('Comments');
	var condition = {pid: options.pid};
	var startPoint = (options.page - 1) * options.limit;
	var endPoint = startPoint + options.limit + 1;
	collection.find(condition).sort({atime: -1}).toArray(function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		var rs = {}, picks = [], uids = [], mycomment, total = 0, count = new Array(5).fill(0);
		d.map(function (v, i) {
			v.rating = validRating(v.rating);
			if(i >= startPoint && i < endPoint) {
				picks.push(v);
				uids.push(v.uid);
			}
			if(!!v.uid && v.uid == options.uid) { mycomment = v; uids.push(v.uid); }
			total += v.rating;
			count[(v.rating - 1)]++;
		});
		rs.rating = {
			average: parseFloat(parseFloat(total/d.length).toFixed(1)) || 0,
			count: count,
			total: d.length
		};
		rs.mycomment = mycomment || {};
		if(startPoint >= 0 && endPoint >= 0) {
			var bot = self.getBot('User');
			var uopt = {uids: uids}
			bot.fetchUsers(uopt, function (e1, d1) {
				if(e1) { return cb(e1); }
				else {
					var removeIndex = options.limit;
					picks = picks.map(function (v, i) {
						var tmpu = dvalue.search(d1, {uid: v.uid});
						v.user = {uid: tmpu.uid, username: tmpu.username, photo: tmpu.photo};
						if(v.uid == options.uid) {removeIndex = i; rs.mycomment = descComment(v);}
						v = descComment(v);
						return v;
					});
					picks.splice(removeIndex, 1);
					rs.comments = picks;
					cb(null, rs);
				}
			});
		}
		else {
			cb(null, rs);
		}
	});
};

/* require: options.pid */
/* optional: options.page, options.limit, options.uid, options.summary */
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

	comment.program = {title: "", cover: ""}
	comment.user = {username: "", photo: ""}
 */
Bot.prototype.listProgramComments = function (options, cb) {
	var self = this;
	// List comments which user publish
	var commentsCollection = self.db.collection('Comments');
	var commentsCond = { pid: options.pid, uid: {$ne: options.uid} };
	var pageOpt = Number(options.page);
	var limitOpt = Number(options.limit);
	var limit = (limitOpt && (limitOpt <= 7 || limitOpt > 0) ) ? limitOpt : 7;
	var skip = (pageOpt && pageOpt >= 1 ) ? (pageOpt - 1) * limit : 0;
	commentsCollection.find(commentsCond).skip(skip).limit(limit)
		.sort([['atime', -1]]).toArray(function (e, comments) {
		if(e) { e.code = '01002'; return cb(e); }

		var bot = self.getBot('User');
		uopt = { uids: comments.map(function (v) { return v.uid; }) };
		bot.fetchUsers(uopt, function (e, d) {
			if(e) { return cb(e); }
			else {
				comments = comments.map(function (v, i) {
					var tmpu = dvalue.search(d, {uid: v.uid});
					v.user = {uid: tmpu.uid, username: tmpu.username, photo: tmpu.photo};
					v = descComment(v);
					return v;
				});
				cb(null, comments);
			}
		});
	});
};

/* require: options.uid */
/* optional: options.pid, options.page, options.limit, options.summary */
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

comment.program = {title: "", cover: ""}
comment.user = {username: "", photo: ""}
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
		var limit = (limitOpt && (limitOpt <= 7 || limitOpt >= 0) ) ? limitOpt : 7;
		commentsCollection.find(commentsCond).skip(skip).limit(limit)
			.sort([['atime', -1]]).toArray(function (e, comments) {
			if(e) { e.code = '01002'; return cb(e); }

			var ret = descComment(comments).map(function(comment){
				comment.user = {uid: user._id, username: user.username, photo: user.photo };
				return comment
			});
			cb(null, ret);
		});
	});
};

// fill rating data
// require: programs
Bot.prototype.fillRatingData = function (options, cb) {
	var self = this;
	var collection = this.db.collection('Comments');
	var index = {};
	var pids = options.programs.map(function (v, i) {
		options.programs[i].rating = {average: 0, count: [0, 0, 0, 0, 0], total: 0};
		index[v.pid] = i;
		return v.pid;
	});
	var condition = {pid: {$in: pids}};
	collection.find(condition, {uid: 1, pid: 1, rating: 1}).toArray(function(e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		d.map(function (v) {
			var i = index[v.pid];
			var r = (v.rating > 0 && v.rating <= 5)? parseInt(v.rating): 1;
			options.programs[i].rating.count[r - 1]++;
			options.programs[i].rating.total++;
		});
		options.programs.map(function (v, i) {
			options.programs[i].rating.average = v.rating.count.reduce(function (pre, curr, i) { return pre + (curr * i); }, 0);
		});
		return cb(null, options.programs);
	});
}

module.exports = Bot;
