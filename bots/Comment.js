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
Bot.prototype.writeComment = function (options, cb) {
	var collection = this.db.collection('Comments');
	// 檢查 uid 並取得 User.verified 帶入 comment
	// 一組 uid/pid 只能存在一則 comment, 若已存在則修改 title, comment, rating, verified 欄位並設定 mtime = atime = new Date().getTime()
	// 若不存在則寫入值需經 formatComment function 處理
	// 成功後回傳 cmid (= _id)
};

/* require: options.cmid */
Bot.prototype.verifyComment = function (options, cb) {
	// Comment.verified 設為 true
};

/* require: options.uid, options.cmid */
Bot.prototype.deleteComment = function (options, cb) {
	// 檢查 uid 格式
	// 檢查 cmid 格式
	// 無回傳資料
};

/* require: options.pid */
/* optional: options.uid, options.page, options.limit */
Bot.prototype.listProgramComments = function (options, cb) {
	// 檢查 pid 格式
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
};

/* optional: options.uid */
/* require: options.pid, options.page, options.limit */
Bot.prototype.listUserComments = function (options, cb) {
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
};

module.exports = Bot;
