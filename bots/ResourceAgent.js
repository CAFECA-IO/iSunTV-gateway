// ResourceAgent APIs (Business logic)
const util = require('util');
const url = require('url');
const path = require('path');

const dvalue = require('dvalue');
const textype = require('textype');

const ParentBot = require('./_Bot.js');
const descProgram = require('../utils/ResourceAgent.js').descProgram;
const fetchImage = require('../utils/ResourceAgent.js').fetchImage;
const request = require('../utils/Crawler.js').request;

var logger;


/************************************************
*                                               *
*               Declare Bot                     *
*                                               *
************************************************/
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
	var self = this;
	var crawlerConfig = this.config.crawler || {};
	var period = crawlerConfig.period || 86400000;

	this.listPrgramType({}, function () {
		var now = new Date().getTime();
		timer = period - (now % period);
		// crawl the program at the start of the day
		setTimeout(function () {
			self.crawl({}, function () {
				logger.info.info('Crawl all programs from:', self.config.resourceAPI);
				self.crawlerInterval = setInterval(function () {
					self.crawl({}, function () {});
				}, period);
			});
		}, timer);
	});
};


/************************************************
*                                               *
*        ResourceAgent APIs                     *
*                                               *
************************************************/
Bot.prototype.listChannel = function (options, cb) {
	this.descChannel({cid: 1}, function (e, d) {
		if(e) { cb(e); }
		else {
			cb(null, [{
				cid: d.cid,
				cover: d.cover,
				title: d.title,
				description: d.description,
				current_program: d.current_program,
				next_program: d.next_program
			}]);
		}
	});
};

/* require: options.cid */
/* optional: options.time, options.days, options.period */
Bot.prototype.descChannel = function (options, cb) {
	var period = options.period > 0? options.period: 30;
	var duration = period * 60 * 1000;
	var picks = 24 * 60 * 7 / period;
	var now = new Date().getTime();
	if(options.time > 0) { picks = options.days > 0? 24 * 60 / period * options.days: 24 * 60 / period; }
	var data = {
		cid: options.cid,
		playable: true,
		url: dvalue.sprintf('https://api.isuntv.com/channel/%s/streaming.m3u8', options.cid),
		cover: 'http://74.82.1.158/uploads/advertisement/isuntv-app-horizontal.jpg',
		title: '陽光衛視',
		description: '陽光下的新鮮事',
		programs: [],
		relation_programs: [],
		current_program: {},
		next_program: {},
		paymentPlans: []
	};
	var program = function () {
		var datas = [{"title":"友好的城市 善良的人民","type":"歷史人文"},{"title":"蘇丹迷失男孩的回鄉路(上)","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"鄺衛華回家種樹","type":"歷史人文"},{"title":"朱辛莊往事","type":"人物傳記"},{"title":"鏡海-華洋共處","type":"人物傳記"},{"title":"方寸之間話美國","type":"歷史人文"},{"title":"財新時間-劉曉光 踐行環保的企業家","type":"訪談"},{"title":"我與三十萬言書","type":"紀錄片"},{"title":"火熱的蘇丹","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"景觀文化-翠湖之舞","type":"紀錄片"},{"title":"佩德拉薩隔世風景","type":"歷史人文"},{"title":"照片裡的故事","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"飄","type":"紀錄片"},{"title":"友好的城市 善良的人民","type":"歷史人文"},{"title":"蘇丹迷失男孩的回鄉路(上)","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"鄺衛華回家種樹","type":"歷史人文"},{"title":"朱辛莊往事","type":"人物傳記"},{"title":"鏡海-華洋共處","type":"人物傳記"},{"title":"方寸之間話美國","type":"歷史人文"},{"title":"財新時間-劉曉光 踐行環保的企業家","type":"訪談"},{"title":"我與三十萬言書","type":"紀錄片"},{"title":"火熱的蘇丹","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"景觀文化-翠湖之舞","type":"紀錄片"},{"title":"佩德拉薩隔世風景","type":"歷史人文"},{"title":"照片裡的故事","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"飄","type":"紀錄片"},{"title":"友好的城市 善良的人民","type":"歷史人文"},{"title":"蘇丹迷失男孩的回鄉路(上)","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"鄺衛華回家種樹","type":"歷史人文"},{"title":"朱辛莊往事","type":"人物傳記"},{"title":"鏡海-華洋共處","type":"人物傳記"},{"title":"方寸之間話美國","type":"歷史人文"},{"title":"財新時間-劉曉光 踐行環保的企業家","type":"訪談"},{"title":"我與三十萬言書","type":"紀錄片"},{"title":"火熱的蘇丹","type":"歷史人文"},{"title":"景觀文化-翠湖之舞","type":"紀錄片"},{"title":"佩德拉薩隔世風景","type":"歷史人文"},{"title":"照片裡的故事","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"飄","type":"紀錄片"},{"title":"孩子與俄羅斯","type":"紀錄片"},{"title":"蘇丹迷失男孩的回鄉路(下)","type":"歷史人文"},{"title":"郭惠勇回家辦廠","type":"紀錄片"},{"title":"我的青春之歌(上)","type":"人物傳記"},{"title":"國殤-喋血長空","type":"人物傳記"},{"title":"元昊之死","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"文革50年祭-魯利玲","type":"歷史人文"},{"title":"友誼之路","type":"歷史人文"},{"title":"子夜-蘇維埃的興亡6-王康","type":"紀錄片"},{"title":"大自然啓示錄","type":"歷史人文"},{"title":"我的伯父(上)","type":"歷史人文"},{"title":"眾籌之門","type":"紀錄片"},{"title":"向天而歌","type":"紀錄片"}];
		var t = options.time > 0? options.time: new Date(new Date().toDateString()).getTime();
		var ft = t - (t % duration);
		var pg = datas[(ft + (duration * i)) % datas.length];
		pg.start = ft + (duration * i);
		return pg;
	};
	for(var i = 0; i < picks; i++) {
		data.programs.push(new program());
	}

	data.programs.find(function(v, i, arr) {
		if((i + 1)< arr.length && arr[i + 1].start > now) {
			data.current_program = v;
			data.next_program = arr[i + 1];
			return true;
		}
	});

	cb(null, data);
};

Bot.prototype.parseChannel = function (resource, cb) {
	var self = this;
	var channel = dvalue.search({id: resource.channel}, this.channels);
	if(channel === undefined) {
		var options = url.parse(this.config.resourceAPI + '/api/getLiveStreamUrl');
		options.datatype = 'json';
		request(options, function (e, d) {
			if(e) { cb(e); }
			else if(!d || !d.data || !d.data.live_stream) {
				e = new Error('channel not found');
				e.code = '39301';
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
/*
[{
	pid: {$pid},
	title: 節目標題,
	description: 說明文字,
	banner: 網路上隨便找好看的 banner 圖片連結
}]
 */
Bot.prototype.listBannerProgram = function (options, cb) {
	// default value
	options = dvalue.default(options, {
		page: 1,
		limit: 6,
	});

	var pics = [
		'http://img08.deviantart.net/e30d/i/2013/210/b/1/batman_superman_movie_promo_banner_by_paulrom-d6fr4kl.png',
		'http://www.forgetthebox.net/wp-content/uploads/2013/06/Man-of-Steel-movie-banner-image.jpg',
		'https://ae01.alicdn.com/kf/HTB13.twLXXXXXbOXpXXq6xXFXXXI/Walking-Dead-Cast-font-b-Vinyl-b-font-Banner-Hi-Res-font-b-Movie-b-font.jpg',
		'http://legionofleia.com/wp-content/uploads/2015/10/assassins-creed-movie-banner.jpg',
		'https://getfuturistic.files.wordpress.com/2013/12/get-futuristic-jupiter-ascending-2014-mila-kunis-and-channing-tatum-official-movie-trailer-poster-2.jpg',
		'http://www.kiwiidigital.com/public/pan_2015_movie-3840x2160.jpg'
	]

	// crawl the tv program api
	var bannerUrl = url.resolve(this.config.resourceAPI, '/api/shows?page=%s&limit=%s')
	bannerUrl = dvalue.sprintf(bannerUrl, options.page, options.limit);
	bannerUrl = url.parse(bannerUrl);
	bannerUrl.datatype = 'json';
	request(bannerUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		// mapping data
		var result = [];
		var programs = res.data;
		for (var i = 0, len = programs.length; i < len; i++){
			programs[i].itemType = 'show';
			var program = descProgram(programs[i]);
			program.banner = pics[(i % pics.length)];
			result.push(program);
		}

		// return data when correct
		cb(null, result);
	})
};

// list featured (精選節目)
// http://app2.isuntv.com/api/featured?page=3&limit=10
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
	paymentPlans: [],
	playable: boolean,
}]
 */
Bot.prototype.listFeaturedProgram = function (options, cb) {
	var self = this;
	// default value
	options = dvalue.default(options, { page: 1, limit: 10 });

	// crawl the tv program api
	var featuredUrl = url.resolve(this.config.resourceAPI, '/api/featured?page=%s&limit=%s');
    featuredUrl = dvalue.sprintf(featuredUrl, options.page, options.limit);
    featuredUrl = url.parse(featuredUrl);
	featuredUrl.datatype = 'json';
	request(featuredUrl, function (e, res) {
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }
		// merge db data
		var programs = descProgram(res.data);
		var pids = programs.map(function (v) { return v.pid; });
		self.mergeByPrograms({pids: pids}, function (e2, d2) {
			// merge payment and playable fields
			var opts = {uid: options.uid, programs: d2};
			self.getBot('Payment').fillPaymentInformation(opts, function (err, programs) {
				if(err) { return cb(err); }
				// fill favorite data
				var ffopts = {uid: options.uid, programs: programs};
				self.getBot('Favorite').fillFavoriteData(ffopts, function (e, d) {
					if(e) { return cb(e); }
					else { cb(null, d); }
				});
			});
		});
	});
};

// list series
// http://app2.isuntv.com/api/shows?page=3&limit=10
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
		{eid: int, title: '嘿！阿弟牯'}
	],
	paymentPlans: [],
	playable: boolean,
	comments: [],
	mycomment: ""
}]
 */
Bot.prototype.listSeries = function (options, cb) {
	var self = this;
	// default value
	options = dvalue.default(options, {
		page: 1,
		limit: 10,
	});

	// crawl the tv program api
	var seriesUrl = url.resolve(this.config.resourceAPI, '/api/shows?page=%s&limit=%s')
	seriesUrl = dvalue.sprintf(seriesUrl, options.page, options.limit);
	seriesUrl = url.parse(seriesUrl);
	seriesUrl.datatype = 'json';
	request(seriesUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		// merge payment and playable fields
		var programs = res.data.map(function(program){
			program.itemType = 'show';
			program = descProgram(program);
			program.programType = self.getProgramType(program.pid)
			return program;
		});
		var opts = {uid: options.uid ,programs: programs};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, programs) {
			if(err) { return cb(err); }
			// fill favorite data
			var ffopts = {uid: options.uid, programs: programs};
			self.getBot('Favorite').fillFavoriteData(ffopts, function (e, d) {
				if(e) { return cb(e); }
				else { cb(null, d); }
			});
		});
	})
};

Bot.prototype.getProgram = function (options, cb) {
	options = dvalue.default(options, {pid: ''});
	var program = {
		type: options.pid.substr(0, 1).toLowerCase(),
		id: options.pid.substr(1)
	};
	var api = url.parse(this.config.resourceAPI);

	switch(program.type) {
		case 's':
			api.pathname = '/api/show';
			api.query = {id: program.id};
			api = url.parse(url.format(api));
			api.datatype = 'json';
			request(api, function (e, d) {
				if(d && d.data) {
					var program = {
						pid: options.pid,
						title: d.data.title,
						cover: fetchImage(d.data).cover
					};
					cb(null, program);
				}
				else { cb(e); }
			});
			break;
		case 'e':
			api.pathname = '/api/episode';
			api.query = {id: program.id};
			api = url.parse(url.format(api));
			api.datatype = 'json';
			request(api, function (e, d) {
				if(d && d.data) {
					var program = {pid: options.pid, title: d.data.title};
					program.cover = fetchImage(d.data).cover;
					cb(null, program);
				}
				else { cb(e); }
			});
			break;
		default:
			var e = new Error('program not found');
			e.code = '39201';
			return cb(e);
	}
};

// series program data
// http://app2.isuntv.com/api/show?id=9
// http://app2.isuntv.com/api/episodes?show_id=9&page=1&limit=10
/* required: options.sid, optional: options: options.page, options.limit */
/* optional: options.uid */
/*
{
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
	paymentPlans: [],
	playable: boolean,
	grading: "G",
	movieType: ["紀錄片"],
	director: ["卜釋仁"],
	actors: ["路人甲", "路人乙", "路人丙"],
	source: ["陽光衛視"],
	subtitle: ["zh-cn", "zh-tw", "en-us"],
	soundtrack: ["chinese", "english"],
	scenarist: ["路平"],
	trailers: ["http://vodcdn.newsun.tv/vodnew/CCULT/CCULT_102B.mp4"],
	//
	comments: [...]
	mycomment: ...
}
 */
Bot.prototype.getSeriesProgram = function (options, cb) {
	// error
	if(!options.sid) { e = new Error('series not found'); e.code = '39401' ; return cb(e); }
	var self = this;

	// crawl show
	var showUrl = url.resolve(self.config.resourceAPI, '/api/show?id=%s')
	showUrl = dvalue.sprintf(showUrl, options.sid);
	showUrl = url.parse(showUrl);
	showUrl.datatype = 'json';
	request(showUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }
		res.data.itemType = 'show';
		var show = descProgram(res.data, true);
		show.programType = self.getProgramType(show.pid);

		// crawl episodes
		var episodesUrl = url.resolve(self.config.resourceAPI, '/api/episodes?show_id=%s&page=%s&limit=%s&token=TEST484863dbb3ce7ca4e080b15b18cd');
		episodesUrl = dvalue.sprintf(episodesUrl, options.sid, options.page, options.limit);
		episodesUrl = url.parse(episodesUrl);
		episodesUrl.datatype = 'json';
		request(episodesUrl, function(e, res){
			// error
			if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

			// merge payment and playable fields for each episode
			var episodes = res.data.reverse().map(function (v) {
				v.itemType = 'episode';
				v.programType = show.programType;
				return descProgram(v, true); 
			});
			var opts = {uid: options.uid ,programs: episodes};
			self.getBot('Payment').fillPaymentInformation(opts, function (err, episodes) {
				show.programs = episodes;
				
				// merge payment and playable fields for single show
				var opts = {uid: options.uid, programs: show};
				self.getBot('Payment').fillPaymentInformation(opts, function (err, show) {
					var pid = show.pid;

					// merge comments
					var bot = self.getBot('Comment');
					bot.summaryProgramComments({pid: pid, uid: options.uid, page: 1, limit: 7}, function (e1, d1) {
						show = dvalue.default(d1, show);

						// fill playback_time_at and is_favored
						self.loadCustomData({pid: pid, uid: options.uid}, function (e2, d2){
							show = dvalue.default(d2, show);
							cb(null, show);
						});
					});
				});
			});
		})
	})
};

// episodes program data
// http://app2.isuntv.com/api/episode?id=9
/* required: options.eid */
/* optional: options.uid */
/*
{
	eid: '',
	title: '',
	description: '',
	cover: '',
	images: [];
	isEnd: boolean,
	createYear: 2002,
	publish: date,
	update: unix_timestamp,
	type: 'episode',
	duration: (minutes),
	paymentPlans: [],
	playable: boolean,
	"grading": "G",
	"movieType": ["紀錄片"],
	"director": ["卜釋仁"],
	"actors": ["路人甲", "路人乙", "路人丙"],
	"source": ["陽光衛視"],
	"subtitle": ["zh-cn", "zh-tw", "en-us"],
	"soundtrack": ["chinese", "english"],
	"scenarist": ["路平"],
	"trailers" ["http://vodcdn.newsun.tv/vodnew/CCULT/CCULT_102B.mp4"]
}
 */
Bot.prototype.getEpisodeProgram = function (options, cb) {
	// error
	if(!options.eid) { e = new Error('episode not found'); e.code = '39402' ; return cb(e); }
	var self = this;

	// crawl the tv program api
	var episodeUrl = url.resolve(self.config.resourceAPI, '/api/episode?id=%s&token=TEST484863dbb3ce7ca4e080b15b18cd');
	episodeUrl = dvalue.sprintf(episodeUrl, options.eid);
	episodeUrl = url.parse(episodeUrl);
	episodeUrl.datatype = 'json';
	request(episodeUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }
		res.data.itemType = 'episode';
		var episode = descProgram(res.data, true);
		episode.programType = self.getProgramType(episode.pid)
		// merge payment and playable fields
		var opts = {uid: options.uid ,programs: episode};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, episode){
			var pid = episode.pid;

			// fill comments
			var bot = self.getBot('Comment');
			bot.summaryProgramComments({pid: pid, uid: options.uid, page: 1, limit: 7}, function (e1, d1) {
				episode = dvalue.default(d1, episode);
				// fill playback_time_at and is_favored
				self.loadCustomData({pid: pid, uid: options.uid}, function (e2, d2){
					episode = dvalue.default(d2, episode);
					cb(null, episode);
				});
			});
		});
	});
};

/* required: options.pid
   optional: options.uid
 */
Bot.prototype.getProgramFromDB = function (options, cb) {
	if(!options.pid) { var e = new Error('program not found'); e.code = '39201' ; return cb(e); }
	var self = this;
	var opts1 = {pids: [options.pid]};
	this.mergeByPrograms(opts1, function (e1, d1) {
		if(e1) { return cb(e1); }
		else if(!Array.isArray(d1) || d1.length == 0) { e = new Error('program not found'); e.code = '39201' ; return cb(e); }
		d1 = d1[0];
		var opts2 = {uid: options.uid ,programs: d1};
		self.getBot('Payment').fillPaymentInformation(opts2, function(e2, d2) {
			if(e2) { return cb(e2); }
			var pid = d2.pid;

			// fill comments
			var opts3 = {pid: pid, uid: options.uid, page: 1, limit: 7};
			self.getBot('Comment').summaryProgramComments(opts3, function (e3, d3) {
				d3 = dvalue.default(d3, d2);
				// fill playback_time_at and is_favored
				var opts4 = {pid: pid, uid: options.uid};
				self.loadCustomData(opts4, function (e4, d4){
					d4 = dvalue.default(d4, d3);
					if(d4.type == 'series') {
						// fetch episodes data
						var opts5 = {pids: d4.programs};
						self.mergeByPrograms(opts5, function (e5, d5) {
							if(e5) { return cb(e5); }
							var opts6 = {uid: options.uid ,programs: d5};
							self.getBot('Payment').fillPaymentInformation(opts6, function (e6, d6) {
								if(e6) { return cb(e6); }
								d4.programs = d6;
								cb(null, d4);
							});
						});
					}
					else {
						cb(null, d4);
					}
				});
			});
		});
	});
};

/* required: options.pid
   optional: options.uid
 */
Bot.prototype.getProgramPlayData = function (options, cb) {
	var self = this;
	this.getProgramFromDB(options, function (e1, d1) {
		if(e1) { return cb(e1); }
		else if(d1.type == 'series') {
			d1.stream = d1.programs[0].stream;
			return cb(null, d1);
		}
		else if(!!d1.sid) {
			var opts2 = {uid: options.uid, pid: d1.sid};
			self.getProgramFromDB(opts2, function (e2, d2) {
				if(e2) { return cb(e2); }
				d1.selected = d1.ep - 1;
				d1.programs = d2.programs;
				d1.type = d2.type;
				d1.number_of_episodes = d2.number_of_episodes;
				return cb(null, d1);
			});
		}
		else {
			return cb(null, d1);
		}
	});
};

// special series
/* random pick series
{
	title: '',
	description: '',
	cover: '',
	programs: [
	  {eid: int, title: '嘿！阿弟牯', description: '...', cover: '', createYear: 2005, publish: date, duration: (minute), paymentPlans: []}
	],
	playable: boolean,
}
 */
Bot.prototype.getSpecialSeries = function (options, cb) {
	var self = this;
	var pageOpt = Number(options.page);
	var limitOpt = Number(options.limit);
	var page = (pageOpt && pageOpt >= 1 ) ? (pageOpt - 1) * 8 : 0;
	var limit = (limitOpt && (limitOpt <= 8 || limitOpt > 0) ) ? limitOpt : 8;
	var specialSeriesUrl = url.resolve(this.config.resourceAPI, '/api/featured?page=%s&limit=%s');
	specialSeriesUrl = dvalue.sprintf(specialSeriesUrl, page, limit);
	specialSeriesUrl = url.parse(specialSeriesUrl);
	specialSeriesUrl.datatype = 'json';
	request(specialSeriesUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		var programs = res.data;
		// mapping data
		var result = {
			title: '中國文化專題',
			description: '',
			cover: '',
			programs: []
		};
		var pids = res.data.map(function (program) {
			program = descProgram(program);
			return program.pid;
		});
		var opts1 = {uid: options.uid, pids: pids};
		self.mergeByPrograms(opts1, function (e1, d1) {
			if(e1) { return cb(e1); }
			var opts2 = {uid: options.uid ,programs: d1};
			self.getBot('Payment').fillPaymentInformation(opts2, function (e2, d2) {
				if(e2) { return cb(e2); }
				// fill favorite data
				var opts3 = {uid: options.uid, programs: d2};
				self.getBot('Favorite').fillFavoriteData(opts3, function (e3, d3) {
					if(e3) { return cb(e3); }
					else {
						result.programs = d3;
						cb(null, result);
					}
				});
			});
		});
	})
};

// latest program
// http://app2.isuntv.com/api/latest
/*
[
	episodeProgram,
	seriesProgram
]
 */
Bot.prototype.getLatestProgram = function (options, cb) {
	// crawl
	var self = this;
	var page = Number(options.page);
	var limit = Number(options.limit);
	var skip;
	page = page >= 1 ? page: 1;
	limit = limit > 0 ? limit: 12;
	skip = (page - 1) * limit;
	var latestUrl = url.parse(url.resolve(this.config.resourceAPI, '/api/latest'));
	latestUrl.datatype = 'json';
	request(latestUrl, function(e, res) {
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }
		// merge db data
		var programs = descProgram(res.data);
		programs = programs.splice(skip, limit);
		var pids = programs.map(function (v) { return v.pid; });
		self.mergeByPrograms({pids: pids}, function (e2, d2) {
			// merge payment and playable fields
			var opts = {uid: options.uid, programs: d2};
			self.getBot('Payment').fillPaymentInformation(opts, function (err, programs) {
				if(err) { return cb(err); }
				// fill favorite data
				var ffopts = {uid: options.uid, programs: programs};
				self.getBot('Favorite').fillFavoriteData(ffopts, function (e, d) {
					if(e) { return cb(e); }
					else { cb(null, d); }
				});
			});
		});
	});
};

// listPrgramType
// http://app2.isuntv.com/api/latest
/*
[
    {
      "ptid": "40",
      "text": "訪談"
    },
]
 */
Bot.prototype.listPrgramType = function (options, cb) {
	var self = this;
	var prgramTypeUrl = url.parse(url.resolve(this.config.resourceAPI, '/api/showsbycategory?parent_id=0'));
	prgramTypeUrl.datatype = 'json';
	request(prgramTypeUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }
		var prgramTypes = [];
		var todo = res.data.length + 1;
		var done = function () {
			if(--todo == 0) {
				self.programTypes = prgramTypes;
				cb(null, prgramTypes);
			}
		};

		res.data.map(function (programType, i) {
			var rs = {
				ptid: programType.id,
				text: programType.title,
			};
			var listProgramByTypeUrl = url.resolve(self.config.resourceAPI, '/api/showsbycategory?parent_id=%s');
			listProgramByTypeUrl = dvalue.sprintf(listProgramByTypeUrl, programType.id);
			listProgramByTypeUrl = url.parse(listProgramByTypeUrl);
			listProgramByTypeUrl.datatype = 'json';
			request(listProgramByTypeUrl, function (e2, list) {
				prgramTypes.push({
					ptid: programType.id,
					text: programType.title,
					pids: list.data.map(function (v) { return 's' + v.id; })
				});
				done();
			});
		});
		done();
	})
};
Bot.prototype.getProgramType = function(id) {
	var defaultType = {
		ptid: '0',
		text: "其他"
	};
	var rs;
	if(!Array.isArray(this.programTypes) || this.programTypes.length == 0) { return defaultType; }
	rs = dvalue.clone(this.programTypes.find(function (v) {
		return v.pids.some(function (v2) {
			return v2 == id; 
		});
	}) || defaultType);
	delete rs.pids;
	return rs;
};

// listPrgramByType
// require: ptid
// optional: uid, page, limit
Bot.prototype.listProgramByType = function (options, cb) {
	var self = this;
	var page = Number(options.page);
	var limit = Number(options.limit);
	var skip;
	page = page >= 1 ? page: 1;
	limit = limit > 0 ? limit: 8;
	skip = (page - 1) * limit;

	var self = this;
	var collection = self.db.collection('Programs');
	collection.find({"programType.ptid": options.ptid}, {_id: 0}).sort([["sid", 1]]).skip(skip).limit(limit).toArray(function (e, programs) {
		if(e) { e.code = '01002'; return cb(e); }
		var opts2 = {uid: options.uid ,programs: programs};
		self.getBot('Payment').fillPaymentInformation(opts2, function (e2, d2) {
			if(e2) { return cb(e2); }
			// fill favorite data
			var opts3 = {uid: options.uid, programs: d2};
			self.getBot('Favorite').fillFavoriteData(opts3, function (e3, d3) {
				if(e3) { return cb(e3); }
				return cb(null, d3);
			});
		});
	});
};

// searchPrograms
Bot.prototype.searchPrograms = function (options, cb) {
	var self = this;

	var tmpUrl = url.parse(this.config.resourceAPI);
	var tmpUrlParams = {
		protocol: tmpUrl.protocol,
		hostname: tmpUrl.hostname,
		pathname: '/api/search',
		query: { keyword: options.keyword }
	};
	if(options.limit > 0) {
		tmpUrlParams.query.page = options.page > 0? options.page: 1;
		tmpUrlParams.query.limit = options.limit;
	}
	else if(options.page > 0) {
		tmpUrlParams.query.page = options.page;
		tmpUrlParams.query.limit = 10;
	}

	var searchedUrl = url.parse(url.format(tmpUrlParams));
	searchedUrl.datatype = 'json';
	request(searchedUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }
		// merge payment and playable fields
		var programs = res.data;
		var pids = programs.map(function (v) { return descProgram(v).pid; });
		self.mergeByPrograms({pids: pids}, function (e2, d2) {
			// merge payment and playable fields
			var opts = {uid: options.uid, programs: d2};
			self.getBot('Payment').fillPaymentInformation(opts, function (err, programs) {
				if(err) { return cb(err); }
				// fill favorite data
				var ffopts = {uid: options.uid, programs: programs};
				self.getBot('Favorite').fillFavoriteData(ffopts, function (e, d) {
					if(e) { return cb(e); }
					else { cb(null, d); }
				});
			});
		});
	});
};

// get relative programs
// require: pid
// optional: uid
Bot.prototype.fetchRelativePrograms = function (options, cb) {
	var self = this;
	this.getProgramFromDB(options, function (e1, d1) {
		if(e1) { return cb(e1); }
		options.keyword = d1.title.substr(0, 2);
		self.searchPrograms(options, function (e2, d2) {
			if(e2) { return cb(e2); }
			var rs = [];
			d2.map(function (v) {
				if(v.pid != options.pid && v.sid != options.pid) { rs.push(v); }
			});
			var opts = {uid: options.uid, programs: rs};
			self.getBot('Comment').fillRatingData(opts, function (e3, d3) {
				if(e3) { return cb(e3); }
				var opts2 = {uid: options.uid, programs: d3};
				self.getBot('Payment').fillPaymentInformation(opts2, function (e4, d4) {
					if(e4) { return cb(e4); }
					else { return cb(null, d4); }
				});
			});
		});
	});
};

//listRentPrograms
// require: uid
// optional: page, limit
/*
{ _id: 57b58ee04227940409571f0e,
    type: 1,
    oid: 57b58ecc4227940409571f0d,
    uid: '57971c7b1b7d91663fa2a23c',
    programs: [ 'e102' ],
    enable: false,
    expire: 1474108384328,
    duration: 172800000,
    ctime: 1471516384328,
    mtime: 1471516384328,
    atime: 1471516384328 }
 */
Bot.prototype.listRentPrograms = function (options, cb) {
	var self = this;
	var collection = self.db.collection('Tickets');
	var query = { uid: options.uid };
	var limit = options.limit ? Number(options.limit) : 0;
	var skip = options.page ? (Number(options.page) - 1) * limit : 0;
	collection.find(query).skip(skip).limit(limit).toArray(function(e, tickets){
		if(e) { e.code = '01002'; return cb(e); }

		var pidMap = {};
		tickets.map(function(ticket){
			ticket.programs.map(function(pid){
				pidMap[pid] = ticket.expire
			})
		})

		var pids = Object.keys(pidMap);
		self.mergeByPrograms({pids: pids}, function(err, programs){
			if(err) { return cb(err); }
			else {
				programs.map(function (v) {
					v.expire = pidMap[v.pid]
					return v
				});
				return cb(null, programs);
			}
		})
	});
}

/**
 * Util function in bot
 */
Bot.prototype.loadCustomData = function(query, cb){
	var self = this;
	var data = {
		is_favored : false,
		playback_time_at : 0,
	};
	var findLastWatch = function (record, programs) {
		var currEP = record? programs.find(function (v) { return v.pid == record.pid; }): programs[0];
		var lw = {ep: currEP.ep, pid: currEP.pid, timing: 0};
		if(record) {
			if(!record.is_finished) {
				lw.timing = record.timing;
			}
			else {
				var nextEP = programs.find(function (v) { return v.ep == currEP.ep + 1; });
				if(nextEP) {
					lw.ep = nextEP.ep;
					lw.pid = nextEP.pid;
					lw.timing = 0;
				}
				else {
					lw.timing = record.timing;
				}
			}
		}
		return lw;
	};
	// Get is_favored from Favorite
	self.db.collection('Favorites').findOne(query, {}, function(e, favorite){
		data.is_favored = favorite ? true : false;
		if(new RegExp('^s').test(query.pid)) {
			self.db.collection('Programs').find({sid: query.pid, type: 'episode'}).sort([['ep', 1]]).toArray(function (e1, d1) {
				if(e1) { e1.code = '01002'; return cb(e1); }
				var pids = d1.map(function (v) { return v.pid; });
				var watchingCond = {pid: {$in: pids}};
				self.db.collection('Watching_programs').find(watchingCond).sort([['atime', -1]]).limit(1).toArray(function (e2, d2) {
					if(e2) { e2.code = '01002'; return cb(e2); }
					data.lastWatch = findLastWatch(d2[0], d1);
					return cb(null, data);
				});
			});
		}
		else {
			// Get playback_time_at from Favorite
			self.db.collection('Watching_programs').findOne(query, {}, function (e, program) {
				data.playback_time_at = program ? program.timing : 0;
				cb(null, data);
			});
		}
	});
};

Bot.prototype.crawl = function (options, cb) {
	this.crawlSeries({}, cb);
};
/* require: options.ppid, options.pid */
Bot.prototype.addToPlan = function (options) {
	if(!this.plans) { this.plans = {}; }
	if(!Array.isArray(this.plans[options.ppid])) { this.plans[options.ppid] = []; }
	if(options.pid) { this.plans[options.ppid].push(options.pid); }
	return true;
};
Bot.prototype.savePlan = function (options, cb) {
	if(!this.plans) { return cb(null); }
	var bot = this.getBot('Payment');
	for(var k in this.plans) {
		var plan = {
			ppid: k,
			programs: this.plans[k]
		};
		bot.updatePaymentPlan(plan, function () {});
	}
	delete this.plans;
	cb(null);
};
Bot.prototype.crawlSeries = function (options, cb) {
	var self = this;
	var seriesUrl = url.resolve(this.config.resourceAPI, '/api/shows?page=%s&limit=%s&token=TEST484863dbb3ce7ca4e080b15b18cd');
	var limit = 20;
	var total = 0;
	var crawlByPage = function (page) {
		page = page > 0? page: 1;
		seriesUrl = url.parse(seriesUrl);
		seriesUrl.datatype = 'json';
		var todo = 1;
		var done = function (e2, d2) {
			if(--todo == 0) {
				// save programs of plan
				self.savePlan({}, function () {});
				cb(null, d2.length);
			}
		};
		request(seriesUrl, function (e1, d1) {
			if(!Array.isArray(d1.data)) { return cb(null, 0); }
			// filter programTypes
			d1 = d1.data;
			todo += d1.length;
			d1.map(function (v) {
				v.pid = 's' + v.id;
				v.programType = self.getProgramType(v.pid);
				var skipType = self.programTypes.some(function (vv) { return vv.ptid == v.id; });
				var options = {sid: v.id, programType: v.programType, skipType: !!skipType};
				self.crawlEpisodes(options, function (e3, d3) {
					v.number_of_episodes = parseInt(d3.length) || 0;
					v.paymentPlans = self.getBot('Payment').findPlan(v.type);
					v.programs = d3;
					if(skipType) { return done(); }
					v = descProgram(v, true);
					// collect series of plan
					v.paymentPlans.map(function (v2) { self.addToPlan({ppid: v2.ppid, pid: v.pid}) });
					self.saveProgram(v, done);
				});
			});
			if(d1.length == limit) {
				page++;
				crawlByPage(page);
			}
			else {
				done();
			}
		});
	};
	crawlByPage(1);
};
Bot.prototype.crawlEpisodes = function (options, cb) {
	if(!options.sid) { cb(null, 0); }
	var self = this;
	var tmpUrl = url.resolve(this.config.resourceAPI, '/api/episodes?show_id=%s&page=%s&limit=%s&token=TEST484863dbb3ce7ca4e080b15b18cd');
	var todo = 1;
	var total = 0;
	var list = [];
	options = options || {};
	var done = function () {
		todo--;
		if(todo == 0) {
			list.sort(function(a, b) { return parseInt(a.pid.substr(1)) > parseInt(b.pid.substr(1)); });
			var pids = list.map(function (v, i) {
				v.ep = i + 1;
				var pid = v.pid;
				self.saveProgram(v, function () {});
				return pid;
			});
			cb(null, pids);
		}
	};
	var crawlByPage = function (page) {
		todo++;
		var page = page || 1;
		var limit = 50;
		episodesUrl = dvalue.sprintf(tmpUrl, options.sid, page, limit);
		episodesUrl = url.parse(episodesUrl);
		episodesUrl.datatype = 'json';
		request(episodesUrl, function (e1, d1) {
			if(!Array.isArray(d1.data)) { cb(null, total); }
			total += d1.data.length;
			d1.data.map(function (v, i) {
				var fulldataURL = url.resolve(self.config.resourceAPI, '/api/episode?id=%s&token=TEST484863dbb3ce7ca4e080b15b18cd');
				fulldataURL = dvalue.sprintf(fulldataURL, v.id);
				fulldataURL = url.parse(fulldataURL);
				fulldataURL.datatype = 'json';
				todo++;
				setTimeout(function () {
					request(fulldataURL, function (e2, d2) {
						var tmpData = d2.data;
						if(!options.skipType) { tmpData.sid = 's' + options.sid; }
						tmpData.paymentPlans = self.getBot('Payment').findPlan(tmpData.type);
						tmpData.programType = options.programType;
						tmpData = descProgram(tmpData, true);
						// collect episode of plan
						tmpData.paymentPlans.map(function (v2) { self.addToPlan({ppid: v2.ppid, pid: tmpData.pid}); });
						list.push(tmpData);
						done();
					});
				}, Math.random() * 1000 * i);
			});
			if(d1.data.length == limit) { crawlByPage(++page); }
			done();
		});
	};
	crawlByPage(1);
	done();
};
Bot.prototype.saveProgram = function (program, cb) {
	var condition = {pid: program.pid};
	delete program.pid;
	var updateQuery = {$set: program};
	var collection = this.db.collection('Programs');
	collection.update(condition, updateQuery, {upsert: true}, function (e, d) {
		if(e) { e.code = '01003'; return cb(e); }
		else { return cb(null, program); }
	});
};

Bot.prototype.listPID = function (options, cb) {
	var collection = this.db.collection('Programs');
	collection.distinct('pid', function (e, d) {
		if(e) { e.code = '01002'; return cb(e); }
		var programs = {
			episode: d.filter(function (v) { return /^e/.test(v); }),
			series: d.filter(function (v) { return /^s/.test(v); })
		};
		cb(null, programs);
	});
};



/**
 * [mergeByPrograms description]
 * @param  {object}   options [options.pids(array)]
 * @param  {Function} cb      [description]
 */
Bot.prototype.mergeByPrograms = function(options, cb){
	var self = this;
	var collection = self.db.collection('Programs');
	collection.find({ pid: { $in : options.pids }}, {_id: 0}).sort([["ep", 1]]).toArray(function(e, programs) {
		if(e) { e.code = '01002'; return cb(e); }
		cb(null, programs);
	});
};


Bot.prototype.request = request;

module.exports = Bot;
