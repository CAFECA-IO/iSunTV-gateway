const ParentBot = require('./_Bot.js');
const util = require('util');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const dvalue = require('dvalue');

var logger;

var request = function (options, cb) {
	var operator;
	if(typeof(options) == 'string') { options = url.parse(options); }
	options = dvalue.default(options, {
		method: 'GET'
	});
	switch(options.protocol) {
		case 'https:':
			operator = https;
			options.rejectUnauthorized = false;
			break;
		default:
			operator = http;
	}
	var crawler = operator.request(options, function (res) {
		var rs = {
			headers: res.headers,
			data: new Buffer([])
		};
		res.on('data', function (chunk) {
			rs.data = Buffer.concat([rs.data, chunk]);
		});
		res.on('end', function () {
			switch(options.datatype) {
				case 'json':
					try { rs.data = JSON.parse(rs.data); } catch(e) { return cb(e); }
					break;
			}
			cb(null, rs)
		})
	});
	crawler.on('error', function (e) { cb(e); })
	if(options.post) {crawler.write(JSON.stringify(options.post));}
	crawler.end();
};

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);
	logger = config.logger;
	this.channels = [];
};

Bot.prototype.start = function () {

};

Bot.prototype.listChannel = function (cb) {
	this.descChannel({cid: 1}, function (e, d) {
		if(e) { cb(e); }
		else {
			cb(null, [{
				cid: d.cid,
				cover: d.cover,
				title: d.title,
				description: d.description,
				program_now: d.program_now,
				program_next: d.program_next
			}]);
		}
	});
};
Bot.prototype.descChannel = function (resource, cb) {
	var data = {
		cid: resource.cid,
		playable: true,
		url: dvalue.sprintf('https://api.isuntv.com/channel/%s/streaming.m3u8', resource.cid),
		cover: 'http://74.82.1.158/uploads/advertisement/isuntv-app-horizontal.jpg',
		title: '陽光衛視',
		description: '陽光下的新鮮事',
		programs: [],
		relation_progreams: [],
		current_program: {},
		next_program: {},
		paymentPlans: []
	};
	var program = function () {
		var datas = [{"title":"友好的城市 善良的人民","type":"歷史人文"},{"title":"蘇丹迷失男孩的回鄉路(上)","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"鄺衛華回家種樹","type":"歷史人文"},{"title":"朱辛莊往事","type":"人物傳記"},{"title":"鏡海-華洋共處","type":"人物傳記"},{"title":"方寸之間話美國","type":"歷史人文"},{"title":"財新時間-劉曉光 踐行環保的企業家","type":"訪談"},{"title":"我與三十萬言書","type":"紀錄片"},{"title":"火熱的蘇丹","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"景觀文化-翠湖之舞","type":"紀錄片"},{"title":"佩德拉薩隔世風景","type":"歷史人文"},{"title":"照片裡的故事","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"飄","type":"紀錄片"},{"title":"友好的城市 善良的人民","type":"歷史人文"},{"title":"蘇丹迷失男孩的回鄉路(上)","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"鄺衛華回家種樹","type":"歷史人文"},{"title":"朱辛莊往事","type":"人物傳記"},{"title":"鏡海-華洋共處","type":"人物傳記"},{"title":"方寸之間話美國","type":"歷史人文"},{"title":"財新時間-劉曉光 踐行環保的企業家","type":"訪談"},{"title":"我與三十萬言書","type":"紀錄片"},{"title":"火熱的蘇丹","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"景觀文化-翠湖之舞","type":"紀錄片"},{"title":"佩德拉薩隔世風景","type":"歷史人文"},{"title":"照片裡的故事","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"飄","type":"紀錄片"},{"title":"友好的城市 善良的人民","type":"歷史人文"},{"title":"蘇丹迷失男孩的回鄉路(上)","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"鄺衛華回家種樹","type":"歷史人文"},{"title":"朱辛莊往事","type":"人物傳記"},{"title":"鏡海-華洋共處","type":"人物傳記"},{"title":"方寸之間話美國","type":"歷史人文"},{"title":"財新時間-劉曉光 踐行環保的企業家","type":"訪談"},{"title":"我與三十萬言書","type":"紀錄片"},{"title":"火熱的蘇丹","type":"歷史人文"},{"title":"景觀文化-翠湖之舞","type":"紀錄片"},{"title":"佩德拉薩隔世風景","type":"歷史人文"},{"title":"照片裡的故事","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"飄","type":"紀錄片"},{"title":"孩子與俄羅斯","type":"紀錄片"},{"title":"蘇丹迷失男孩的回鄉路(下)","type":"歷史人文"},{"title":"郭惠勇回家辦廠","type":"紀錄片"},{"title":"我的青春之歌(上)","type":"人物傳記"},{"title":"國殤-喋血長空","type":"人物傳記"},{"title":"元昊之死","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"文革50年祭-魯利玲","type":"歷史人文"},{"title":"友誼之路","type":"歷史人文"},{"title":"子夜-蘇維埃的興亡6-王康","type":"紀錄片"},{"title":"大自然啓示錄","type":"歷史人文"},{"title":"我的伯父(上)","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"向天而歌","type":"紀錄片"}];
		var t = new Date().getTime();
		var ft = t - (t % 1800000);
		var pg = dvalue.randomPick(datas, 1)[0];
		pg.start = ft + (1800000 * i);
		return pg;
	};
	for(var i = 0; i < 336; i++) {
		data.programs.push(new program());
	}
	data.program_now = data.programs[0];
	data.program_next = data.programs[1];
	cb(null, data);
};
Bot.prototype.parseChannel = function (resource, cb) {
	var self = this;
	var channel = dvalue.search({id: resource.channel}, this.channels);
	if(channel === undefined) {
		var options = url.parse('http://app.chinasuntv.com/index.php/api/getLiveStreamUrl');
		options.datatype = 'json';
		request(options, function (e, d) {
			if(e) { cb(e); }
			else if(!d || !d.data || !d.data.live_stream) {
				e = new Error('channel not found');
				e.code = '39201';
				cb(e);
			}
			else {
				var channel = {id: resource.channel, url: d.data.live_stream};
				var link = channel.url;
				channel.path = path.parse(channel.url).dir;
				self.channels.push(channel);
				cb(null, link);
			}
		});
	}
	else {
		cb(null, channel.url);
	}
};
// resource.path, resource.channel
Bot.prototype.channelResource = function (resource, cb) {
	var channel = dvalue.search({id: resource.channel}, this.channels);
	if(channel === undefined) {
		var e = new Error('channel not found');
		e.code = '39201';
		cb(e);
	}
	else {
		var link, tmp = url.parse(channel.path);
		tmp.pathname = path.join(tmp.path, resource.path);
		var link = url.format(tmp);
		cb(null, link);
	}
};

/*
	paymentPlans = [
		{pid: {$pid}, text: '單租', price: {currency: 'TWD', value: 30}},
		{pid: {$pid}, text: '月租', price: {currency: 'TWD', value: 300}},
		{pid: {$pid}, text: '套餐', price: {currency: 'TWD', value: 90}}
	]
 */

// banner program
/* optional: options.page, options.limit */
Bot.prototype.listBannerProgram = function (options, cb) {};

// list featured (精選節目)
/* optional: options.page, options.limit */
/*
{

}
 */
Bot.prototype.listFeaturedProgram = function (options, cb) {};

// list series
// http://app.chinasuntv.com/index.php/api/shows?page=3&limit=10
/* optional: options.page, options.limit */
/*
[{
	eid: '',
	title: '',
	description: '',
	cover: '',
	isEnd: boolean,
	createYear: 2002,
	update: unix_timestamp,
	type: 'episode',
	duration: (minutes),
	paymentPlans: []
}]
 */
Bot.prototype.listSeries = function (options, cb) {};

// series program data
// http://app.chinasuntv.com/index.php/api/show?id=9
// http://app.chinasuntv.com/index.php/api/episodes?show_id=9&page=1&limit=10
/* optional: options.page, options.limit */
/*
[{
	sid: '',
	title: '',
	description: '',
	cover: '',
	isEnd: boolean,
	createYear: 2002,
	update: unix_timestamp,
	type: 'series',
	programs: [
		{eid: int, title: '嘿！阿弟牯', description: '...', cover: '', createYear: 2005, publish: date, duration: (minute), paymentPlans: []}
	],
	paymentPlans: []
}]
 */
Bot.prototype.getSeriesProgram = function (options, cb) {};

// episodes program data
// http://app.chinasuntv.com/index.php/api/episode?id=9&page=1&limit=10
/*
[{
	eid: '',
	title: '',
	description: '',
	cover: '',
	isEnd: boolean,
	createYear: 2002,
	publish: date,
	update: unix_timestamp,
	type: 'episode',
	duration: (minutes),
	paymentPlans: []
}]
 */
Bot.prototype.getEpisodeProgram = function (options, cb) {};

// special series
/* random pick series
{
  sid: '',
	title: '',
	description: '',
	cover: '',
	isEnd: boolean,
	createYear: 2002,
	update: unix_timestamp,
	type: 'series/episode',
	duration: (minutes),
	programs: [
	  {eid: int, title: '嘿！阿弟牯', description: '...', cover: '', createYear: 2005, publish: date, duration: (minute), paymentPlans: []}
	],
	paymentPlans: []
}
 */
Bot.prototype.getSpecialSeries = function (options, cb) {};

// latest program
// http://app.chinasuntv.com/index.php/api/latest
/*
[
	episodeProgram,
	seriesProgram
]
 */
Bot.getLatestProgram = function (cb) {};

Bot.prototype.request = request;

module.exports = Bot;
