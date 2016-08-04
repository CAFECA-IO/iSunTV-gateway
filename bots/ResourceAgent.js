const ParentBot = require('./_Bot.js');
const util = require('util');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const dvalue = require('dvalue');
const textype = require('textype');

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

var fetchImage = function (data) {
	var result = {cover: "", images: []};
	if(textype.isURL(data.image_thumb)) { result.cover = data.image_thumb; result.images.push(data.image_thumb); }
	if(textype.isURL(data.image_cover)) { result.cover = data.image_cover; result.images.push(data.image_cover); }
	if(textype.isURL(data.image_cover1)) { result.cover = data.image_cover1; result.images.push(data.image_cover1); }
	if(textype.isURL(data.image_cover2)) { result.cover = data.image_cover2; result.images.push(data.image_cover2); }
	if(textype.isURL(data.image_cover3)) { result.cover = data.image_cover3; result.images.push(data.image_cover3); }
	if(textype.isURL(data.image_cover4)) { result.cover = data.image_cover4; result.images.push(data.image_cover4); }
	if(textype.isURL(data.image_cover5)) { result.cover = data.image_cover5; result.images.push(data.image_cover5); }
	if(textype.isURL(data.image_cover6)) { result.cover = data.image_cover6; result.images.push(data.image_cover6); }
	if(textype.isURL(data.image_cover_full)) { result.cover = data.image_cover_full; result.images.push(data.image_cover_full); }
	if(textype.isURL(data.image_cover1_full)) { result.cover = data.image_cover1_full; result.images.push(data.image_cover1_full); }
	if(textype.isURL(data.image_cover2_full)) { result.cover = data.image_cover2_full; result.images.push(data.image_cover2_full); }
	if(textype.isURL(data.image_cover3_full)) { result.cover = data.image_cover3_full; result.images.push(data.image_cover3_full); }
	if(textype.isURL(data.image_cover4_full)) { result.cover = data.image_cover4_full; result.images.push(data.image_cover4_full); }
	if(textype.isURL(data.image_cover5_full)) { result.cover = data.image_cover5_full; result.images.push(data.image_cover5_full); }
	if(textype.isURL(data.image_cover6_full)) { result.cover = data.image_cover6_full; result.images.push(data.image_cover6_full); }
	return result;
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
				current_program: d.current_program,
				next_program: d.next_program
			}]);
		}
	});
};
Bot.prototype.descChannel = function (options, cb) {
	var picks = 336;
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
		var t = options.time > 0? options.time: new Date().getTime();
		var ft = t - (t % 1800000);
		var pg = dvalue.randomPick(datas, 1)[0];
		pg.start = ft + (1800000 * i);
		return pg;
	};
	for(var i = 0; i < picks; i++) {
		data.programs.push(new program());
	}
	data.current_program = data.programs[0];
	data.next_program = data.programs[1];
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
			var program = programs[i];
			var programData = {
				pid: 's' + program.id,
				type: 'series',
				title: program.title,
				description: program.description.substr(0, 70),
				shortdesc: program.shortdesc || '',
				//cover: program.image_thumb,
				//isEnd: true, // fake data
				//createYear: 2099, // fake data
				//paymentPlans: [], // fake data
				//playable: true,
				banner: pics[(i % pics.length)],
			}
			if (program.type === 'show'){
				programData.pid = 's' + program.id;
				//programData.updated_at = program.updated_at;
				//programData.programs = [{eid: int, title: '嘿！阿弟牯'}];
				//programData.type = 'series'
			}
			else if (program.type === 'episode'){
				programData.pid = 'e' + program.id;
				//programData.duration = 2 * 60;
				//programData.type = 'episode'
			}
			else {
				programData.pid = 'e' + program.id;
				//programData.duration = 2 * 60;
				//programData.type = 'episode'
			}
			result.push(programData);
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
	options = dvalue.default(options, {
		page: 1,
		limit: 10,
	});

	// crawl the tv program api
	var featuredUrl = this.config.resourceAPI + '/api/featured?page=%s&limit=%s'
	featuredUrl = dvalue.sprintf(featuredUrl, options.page, options.limit);
	featuredUrl = url.parse(featuredUrl);
	featuredUrl.datatype = 'json';
	request(featuredUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		// mapping data
		var result = [];
		var programs = res.data;
		for (var i = 0, len = programs.length; i < len; i++){
			var program = programs[i];
			var programData = {
				title: program.title,
				description: program.description,
				shortdesc: program.shortdesc || '',
				cover: program.image_thumb,
				isEnd: true, // fake data
				createYear: 2099, // fake data
				paymentPlans: [], // fake data
				playable: true,
			}
			if (program.type === 'show'){
				programData.pid = 's' + program.id;
				programData.updated_at = program.updated_at;
				programData.programs = [{eid: int, title: '嘿！阿弟牯'}];
				programData.type = 'series'
			}
			else if (program.type === 'episode'){
				programData.pid = 'e' + program.id;
				programData.duration = 2 * 60;
				programData.type = 'episode'
			}
			else {
				programData.pid = 'e' + program.id;
				programData.duration = 2 * 60;
				programData.type = 'episode'
			}
			result.push(programData);
		}

		cb(null, result);
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

		// mapping data
		var result = [];
		var programs = res.data;
		for (var i = 0, len = programs.length; i < len; i++){
			var program = programs[i];
			result.push({
				sid: program.id,
				title: program.title,
				description: program.description,
				cover: program.image_thumb,
				isEnd: true, // fake data
				createYear: 2099, // fake data
				update: program.updated_at,
				type: 'series',
				duration: 2*60, // 2h, fake data
				programs: [
					{eid: "123", title: '嘿！阿弟牯'}
				], // fake data
				paymentPlans: [], // fake data
				playable: true,
			})
		}

		// return data when correct
		cb(null, result);
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
					var program = {title: d.data.title, cover: fetchImage(d.data).cover};
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
					var program = {title: d.data.title};
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

		// crawl episodes
		var episodesUrl = self.config.resourceAPI + '/api/episodes?show_id=%s&page=%s&limit=%s';
		episodesUrl = dvalue.sprintf(episodesUrl, options.sid, options.page, options.limit);
		episodesUrl = url.parse(episodesUrl);
		episodesUrl.datatype = 'json';
		request(episodesUrl, function(e, res){
			// error
			if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

			var episodes = res.data;

			// mapping data except programs
			var result = {
				sid: show.id,
				title: show.title,
				description: show.description,
				cover: show.image_cover,
				isEnd: true, // fake data
				createYear: 2099, // fake data
				update: show.updated_at,
				type: 'series',
				programs: [],
				paymentPlans: [], // fake data
				playable: true,
				grading: "16+",
				movieType: ["紀錄片"],
				director: ["卜釋仁"],
				actors: ["路人甲", "路人乙", "路人丙"],
				source: ["陽光衛視"],
				subtitle: ["zh-cn", "zh-tw", "en-us"],
				soundtrack: ["chinese", "english"],
				scenarist: ["路平"],
				trailers: ["http://vodcdn.newsun.tv/vodnew/CCULT/CCULT_102B.mp4"],

			}
			// mapping data with programs
			for (var i = 0, len = episodes.length; i < len; i++){
				var episode = episodes[i];
				result.programs.push({
					eid: episode.id,
					title: episode.title,
					description: episode.description,
					cover: episode.image_thumb,
					createYear: 2099, // fake data
					publish: '2099-12-31',
					duration: 2*60, // 2h, fake data
					paymentPlans: [], // fake data
					playable: true,
				})
			}

			// fill comments
			// List user comments
			var commentsCollection = self.db.collection('Comments');
			var commentsCond = { pid: 's' + options.sid };
			commentsCollection.find(commentsCond)
				.limit(7).sort([['atime', -1]]).toArray(function (e, comments) {
				if(e) { e.code = '01002'; return cb(e); }
				result.comments = comments;

				// fill mycomment
				commentsCond.uid = options.uid;
				commentsCollection.findOne(commentsCond, {}, function(e, comment){
					if(e) { e.code = '01002'; return cb(e); }
					result.mycomment = comment
					cb(null, result);
				})
			});

		})

	})
};

// episodes program data
// http://app2.isuntv.com/api/episode?id=9
/* required: options.eid */
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
		var episode = res.data;

		// fetch valid img resources as a array
		var fetchedImage = fetchImage(episode)

		// mapping data
		var result = {
			eid: episode.id,
			title: episode.title,
			description: episode.description,
			cover: fetchedImage.cover,
			images: fetchedImage.images,
			isEnd: true, // fake data
			createYear: 2099, // fake data
			update: episode.updated_at,
			type: 'episode',
			duration: 2*60, // 2h, fake data
			paymentPlans: [], // fake data
			playable: true,
			grading: "G",
			movieType: ["紀錄片"],
			director: ["卜釋仁"],
			actors: ["路人甲", "路人乙", "路人丙"],
			source: ["陽光衛視"],
			subtitle: ["zh-cn", "zh-tw", "en-us"],
			soundtrack: ["chinese", "english"],
			scenarist: ["路平"],
			trailers: ["http://vodcdn.newsun.tv/vodnew/CCULT/CCULT_102B.mp4"],
		};

		// fill comments
		var bot = self.getBot('Comment');
		bot.listProgramComments({pid: options.pid}, function (e, d) {
			result.comments = d.comments;
			cb(null, result);
		});
	})
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
	var specialSeriesUrl = this.config.resourceAPI + '/api/shows?page=%s&limit=%s'
	specialSeriesUrl = dvalue.sprintf(specialSeriesUrl, 1, 8);
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

		for (var i = 0, len = programs.length; i < len; i++){
			var program = programs[i];
			var programData = {
				title: program.title,
				description: program.description,
				shortdesc: program.shortdesc || '',
				cover: program.image_thumb,
				isEnd: true, // fake data
				createYear: 2099, // fake data
				paymentPlans: [], // fake data
				playable: true,
			}
			if (program.type === 'show'){
				programData.pid = 's' + program.id;
				programData.updated_at = program.updated_at;
				programData.programs = [{eid: 1009, title: '嘿！阿弟牯'}];
				programData.type = 'series'
			}
			else if (program.type === 'episode'){
				programData.pid = 'e' + program.id;
				programData.duration = 2 * 60;
				programData.type = 'episode'
			}
			else {
				programData.pid = 'e' + program.id;
				programData.duration = 2 * 60;
				programData.type = 'episode'
			}
			result.programs.push(programData);
		}

		// fill comments
		var bot = self.getBot('Comment');
		bot.listProgramComments({pid: options.pid}, function (e, d) {
			result.comments = d.comments;
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
	var latestUrl = url.parse(this.config.resourceAPI + '/api/latest');
	latestUrl.datatype = 'json';
	request(latestUrl, function(e, res){
		// error
		if(e) { e = new Error('remote api error'); e.code = '54001' ; return cb(e); }

		var result = [];
		var programs = res.data;
		for (var i = 0, len = programs.length; i < len; i++){
			var program = programs[i];
			var programData = {
				title: program.title,
				description: program.description,
				shortdesc: program.shortdesc || '',
				cover: program.image_thumb,
				isEnd: true, // fake data
				createYear: 2099, // fake data
				paymentPlans: [], // fake data
				playable: true,
			}
			if (program.type === 'show'){
				programData.pid = 's' + program.id;
				programData.updated_at = program.updated_at;
				programData.programs = [{eid: int, title: '嘿！阿弟牯'}];
				programData.type = 'series'
			}
			else if (program.type === 'episode'){
				programData.pid = 'e' + program.id;
				programData.duration = 2 * 60;
				programData.type = 'episode'
			}
			else {
				programData.pid = 'e' + program.id;
				programData.duration = 2 * 60;
				programData.type = 'episode'
			}
			result.push(programData)
		}

		cb(null, result);

	})
};

Bot.prototype.request = request;

module.exports = Bot;
