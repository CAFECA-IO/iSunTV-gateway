/**
 * utils for ResourceAgent
 */
const textype = require('textype');
const dvalue = require('dvalue');

const descProgram = function (data, detail) {
	if(Array.isArray(data)) { return data.map(function (v) { return descProgram(v, detail); }); }
	var img = fetchImage(data);
	var stream = fetchStream(data);
	var program = {
		pid: data.pid,
		type: '',
		title: data.title,
		description: data.description,
		shortdesc: data.shortdesc || data.description.substr(0, 16) + '...',
		cover: toHttps(img.cover),
		banner: toHttps(data.imgtf_web),
		bannerList: {
			web: data.imgtf_web,
			iphone: data.imgtf_iphone,
			ipad: data.imgtf_ipad,
			android: data.imgtf_android
		},
		images: img.images,
		updated: data.updated_at || '',
		createYear: data.releaseyear || '',
		publish: '',
		grading: '',
		programType: data.programType
	};
	if(data.paymentPlans) { program.paymentPlans = data.paymentPlans; }
	// series/ episode/ episode of series
	switch(data.itemType) {
		case 'show':
			program.pid = data.pid || 's' + data.id;
			program.type = 'series';
			program.sid = data.id;
			program.isEnd = true; //-- fake data
			program.programs = data.programs;
			program.number_of_episodes = data.number_of_episodes > 0? data.number_of_episodes: Array.isArray(data.programs)? data.programs.length: 0;
			break;
		case 'episode':
		default:
			program.pid = data.pid || 'e' + data.id;
			program.type = 'episode';
			program.eid = data.id;
			program.duration = 0;
			if(data.sid) {
				program.sid = data.sid;
				program.ep = data.ep || 1;
			}
			else if(data.show_id) {
				program.sid = 's' + data.show_id;
			}
			if (data.length && typeof data.length === 'string') {
				var lengthArr = data.length.split(/\D/).filter(function(v) { return v.length > 0 }).map(function (v) { return parseInt(v) || 0; });
				if (lengthArr.length == 3) {
					program.duration = lengthArr[0] * 60 + lengthArr[1] * 1 + lengthArr[2] / 60.0;
					program.duration = parseInt(program.duration);
				} else if (lengthArr.length == 2) {
					program.duration = lengthArr[0] * 1 + lengthArr[1] / 60.0;
					program.duration = parseInt(program.duration);
				}
			}
			else {
				program.duration = 0;
			}

			if(data.show_id && data.show_id.length > 0) { data.sid = data.show_id; }
			break;
	}
	if(!!detail) {
		program.stream = stream.stream;
		program.directors = Array.isArray(data.directors)? data.directors: data.directors? data.directors.split(','): [];
		program.actors = Array.isArray(data.actors)? data.actors: data.actors? data.actors.split(','): [];
		program.source = Array.isArray(data.source)? data.source: data.source? data.source.split(','): [];
		program.subtitle = Array.isArray(data.subtitles)? data.subtitles: data.subtitles? data.subtitles.split(','): [];
		program.soundtrack = Array.isArray(data.tracks)? data.tracks: data.tracks? data.tracks.split(','): [];
		program.trailers = [];
		program.scenarist = [];
	}
	return program;
};


const fetchStream = function (data) {
	var result = {stream: ""};
	if(textype.isURL(data.ipad_stream_url)) { result.stream = data.ipad_stream_url; }
	else if(textype.isURL(data.stream_url)) { result.stream = data.stream_url; }
	return result;
};
const toHttps = function (data) {
	if(textype.isURL(data)) { data = data.replace(/^http:/, 'https:'); }
	return data;
};


const fetchImage = function (data) {
	var result = {cover: "", images: []};
	if(textype.isURL(data.image_thumb)) { result.cover = data.image_thumb; result.images.push(data.image_thumb); }
	if(textype.isURL(data.image_cover)) { result.cover = data.image_cover; result.images.push(data.image_cover); }
	if(textype.isURL(data.image_cover6)) { result.cover = data.image_cover6; result.images.push(data.image_cover6); }
	if(textype.isURL(data.image_cover5)) { result.cover = data.image_cover5; result.images.push(data.image_cover5); }
	if(textype.isURL(data.image_cover4)) { result.cover = data.image_cover4; result.images.push(data.image_cover4); }
	if(textype.isURL(data.image_cover3)) { result.cover = data.image_cover3; result.images.push(data.image_cover3); }
	if(textype.isURL(data.image_cover2)) { result.cover = data.image_cover2; result.images.push(data.image_cover2); }
	if(textype.isURL(data.image_cover1)) { result.cover = data.image_cover1; result.images.push(data.image_cover1); }
	if(textype.isURL(data.image_cover_full)) { result.cover = data.image_cover_full; result.images.push(data.image_cover_full); }
	if(textype.isURL(data.image_cover1_full)) { result.cover = data.image_cover1_full; result.images.push(data.image_cover1_full); }
	if(textype.isURL(data.image_cover2_full)) { result.cover = data.image_cover2_full; result.images.push(data.image_cover2_full); }
	if(textype.isURL(data.image_cover3_full)) { result.cover = data.image_cover3_full; result.images.push(data.image_cover3_full); }
	if(textype.isURL(data.image_cover4_full)) { result.cover = data.image_cover4_full; result.images.push(data.image_cover4_full); }
	if(textype.isURL(data.image_cover5_full)) { result.cover = data.image_cover5_full; result.images.push(data.image_cover5_full); }
	if(textype.isURL(data.image_cover6_full)) { result.cover = data.image_cover6_full; result.images.push(data.image_cover6_full); }
	return result;
};


/**
 * export mdoules
 */
module.exports = {
	descProgram: descProgram,
	fetchImage: fetchImage,
};
