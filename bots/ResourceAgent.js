// ResourceAgent APIs (Business logic)
const util = require('util');
const url = require('url');
const path = require('path');

const dvalue = require('dvalue');

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

	this.listPrgramType({}, function () {});
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

Bot.prototype.descChannel = function (options, cb) {
	var picks = 336;
	var now = new Date().getTime();
	if(options.time > 0) { picks = options.days > 0? 48 * options.days: 48; }
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
		var ft = t - (t % 1800000);
		var pg = datas[(ft + (1800000 * i)) % datas.length];
		pg.start = ft + (1800000 * i);
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
	var bannerUrl = this.config.resourceAPI + '/api/shows?page=%s&limit=%s'
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
			var program = dvalue.default(descProgram(programs[i]), {
				banner: pics[(i % pics.length)],
			});
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
	var featuredUrl = this.config.resourceAPI + '/api/featured?page=%s&limit=%s'
	featuredUrl = dvalue.sprintf(featuredUrl, options.page, options.limit);
	featuredUrl = url.parse(featuredUrl);
	featuredUrl.datatype = 'json';
	request(featuredUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		// merge payment and playable fields
		var opts = {uid: options.uid ,programs: res.data.map(descProgram)};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, programs){
			cb(null, programs);
		});
	})
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
	var seriesUrl = this.config.resourceAPI + '/api/shows?page=%s&limit=%s'
	seriesUrl = dvalue.sprintf(seriesUrl, options.page, options.limit);
	seriesUrl = url.parse(seriesUrl);
	seriesUrl.datatype = 'json';
	request(seriesUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		// merge payment and playable fields
		var programs = res.data.map(function(program){
			program.programType = self.getProgramTypes(program.id)
			return descProgram(program)
		});
		var opts = {uid: options.uid ,programs: programs};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, programs){
			cb(null, programs);
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
	var showUrl = self.config.resourceAPI + '/api/show?id=%s'
	showUrl = dvalue.sprintf(showUrl, options.sid);
	showUrl = url.parse(showUrl);
	showUrl.datatype = 'json';
	request(showUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		var show = res.data;
		show.type = 'show';

		// crawl episodes
		var episodesUrl = self.config.resourceAPI + '/api/episodes?show_id=%s&page=%s&limit=%s';
		episodesUrl = dvalue.sprintf(episodesUrl, options.sid, options.page, options.limit);
		episodesUrl = url.parse(episodesUrl);
		episodesUrl.datatype = 'json';
		request(episodesUrl, function(e, res){
			// error
			if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

			// merge payment and playable fields for each episode
			var episodes = res.data.map(descProgram);
			var opts = {uid: options.uid ,programs: episodes};
			self.getBot('Payment').fillPaymentInformation(opts, function(err, episodes){
				//console.log(episodes);
				show.programs = episodes;
				show.programType = self.getProgramTypes(show.id);

				// merge payment and playable fields for single show
				var opts = {uid: options.uid ,programs: show};
				self.getBot('Payment').fillPaymentInformation(opts, function(err, show){
					var pid = 's' + show.id;

					// async backup: should use pid as _id
					self.asyncRecordingProgram(pid, show);

					// merge comments
					var bot = self.getBot('Comment');
					bot.summaryProgramComments({pid: pid, uid: options.uid, page: 1, limit: 7}, function (e, d) {
						show = dvalue.default(d, show);

						// fill playback_time_at and is_favored
						self.loadCustomData({pid: pid, uid: options.uid}, function (e, d){
							show = dvalue.default(d, show);
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
	var episodeUrl = this.config.resourceAPI + '/api/episode?id=%s'
	episodeUrl = dvalue.sprintf(episodeUrl, options.eid);
	episodeUrl = url.parse(episodeUrl);
	episodeUrl.datatype = 'json';
	request(episodeUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		var episode = descProgram(res.data);
		episode.type = 'episode';
		episode.programType = self.getProgramTypes(options.eid)

		// merge payment and playable fields
		var opts = {uid: options.uid ,programs: episode};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, episode){
			var pid = 'e' + episode.id;

			//
			self.asyncRecordingProgram(pid, episode);

			// fill comments
			var bot = self.getBot('Comment');
			bot.summaryProgramComments({pid: pid, uid: options.uid, page: 1, limit: 7}, function (e, d) {
				episode = dvalue.default(d, episode);

				// fill playback_time_at and is_favored
				self.loadCustomData({pid: pid, uid: options.uid}, function (e, d){
					episode = dvalue.default(d, episode);
					cb(null, episode);
				});
			});
		});

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
	var specialSeriesUrl = this.config.resourceAPI + '/api/featured?page=%s&limit=%s'
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
			programs: [],
		};

		// merge payment and playable fields
		var programs = res.data.map(function(program){
			program.programType = self.getProgramTypes(program.id);
			return descProgram(program)
		});
		var opts = {uid: options.uid ,programs: programs};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, programs){
			result.programs.push(programs);
			cb(null, result);
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
	page = page >= 1 ? page: 1;
	limit = limit > 0 ? limit: 12;
	var latestUrl = url.parse(this.config.resourceAPI + '/api/latest');
	latestUrl.datatype = 'json';
	request(latestUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		var startIndex = limit * (page - 1);
		var endIndex = startIndex + limit;

		// merge payment and playable fields
		var programs = res.data.map(function(program){
			program.programType = self.getProgramTypes(program.id);
			return descProgram(program)
		});
		var opts = {uid: options.uid ,programs: programs};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, programs){
			cb(null, programs);
		});

	})
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

	var prgramTypeUrl = this.config.resourceAPI + '/api/showsbycategory?parent_id=0';
	prgramTypeUrl = url.parse(prgramTypeUrl);
	prgramTypeUrl.datatype = 'json';
	request(prgramTypeUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		var prgramTypes = res.data.map(function(programType){
			return {
				ptid: programType.id,
				text: programType.title,
			}
		});

		// Cache in Bot
		self.programTypes = prgramTypes;
		self.getProgramTypes = function(id){
			return self.programTypes[(parseInt(id) || 0) % self.programTypes.length];
		}

		cb(null, prgramTypes);
	})
};

// listPrgramByType
Bot.prototype.listPrgramByType = function (options, cb) {
	var self = this;
	var page = Number(options.page);
	var limit = Number(options.limit);
	page = page >= 1 ? page: 1;
	limit = limit > 0 ? limit: 8;

	var theProgramTypeUrl = this.config.resourceAPI + '/api/showsbycategory?parent_id=%s';
	theProgramTypeUrl = dvalue.sprintf(theProgramTypeUrl, options.ptid);
	theProgramTypeUrl = url.parse(theProgramTypeUrl);
	theProgramTypeUrl.datatype = 'json';
	request(theProgramTypeUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		// merge payment and playable fields
		var programType = dvalue.search(self.programTypes, { ptid: options.ptid });
		var programsByType = res.data.map(function(program){
			program.programType = programType;
			return descProgram(program);
		});
		var opts = {uid: options.uid ,programs: programsByType};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, programs){
			cb(null, programs);
		});
	})
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
		var programs = res.data.map(function(program){
			program.programType = self.getProgramTypes(program.id);
			return descProgram(program)
		});
		var opts = {uid: options.uid ,programs: programs};
		self.getBot('Payment').fillPaymentInformation(opts, function(err, programs){
			cb(null, programs);
		});

	});
};

/**
 * Util function in bot
 */
Bot.prototype.mergeByPrograms = function(freshObjs, cb){
	var self = this;
	//
	var pids = freshObjs.map(function(freshObj){ return freshObj.pid });

	var collection = self.db.collection('Programs');
	var query = { _id: { $in : pids }};
	collection.find(query).toArray(function(e, programs){
		var mergedObjs = freshObjs.map(function(freshObj){
			var program = dvalue.search(programs, { _id : freshObj.pid });
			return dvalue.default(freshObj, program);
		})
		cb(null, mergedObjs);
	});
};

Bot.prototype.loadCustomData = function(query, cb){
	var self = this;
	var data = {
		is_favored : null,
		playback_time_at : null,
	}

	// Get is_favored from Favorite
	self.db.collection('Favorites').findOne(query, {}, function(e, favorite){
		data.is_favored = favorite ? true : false;

		// Get playback_time_at from Favorite
		self.db.collection('Watching_programs').findOne(query, {}, function(e, program){
			data.playback_time_at = program ? program.timing : null;
			cb(null, data);
		});
	});
};

Bot.prototype.asyncRecordingProgram = function (pid, program) {
	var criteria = { _id: pid };
	var update = { $set: dvalue.default(descProgram(program, true), criteria) };
	var updatedOptions = { upsert: true };
	this.db.collection('Programs').updateOne(criteria, update, updatedOptions);
}

Bot.prototype.request = request;

module.exports = Bot;
