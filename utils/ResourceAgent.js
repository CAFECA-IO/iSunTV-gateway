/**
 * utils for ResourceAgent
 */
const textype = require('textype');


const descProgram = function (data, detail) {
	var img = fetchImage(data);
	var program = {
		pid: '',
		type: '',
		title: data.title,
		description: data.description,
		shortdesc: data.shortdesc || '',
		cover: img.cover,
		images: img.images,
		updated: data.updated_at,
		isEnd: true, //-- fake data
		createYear: 2099 //-- fake data
	}
	// series/ episode/ episode of series
	switch(data.type) {
		case 'show':
			program.pid = 's' + data.id;
			program.type = data.type;
			program.sid = data.id;
			break;
		case 'episode':
		default:
			program.pid = 'e' + data.id;
			program.type = 'episode';
			program.eid = data.id;
			program.duration = parseInt(Math.random() * 180); //-- fake data
			if(data.show_id && data.show_id.length > 0) { data.sid = data.show_id; }
			break;
	}
	return program
};


const fetchImage = function (data) {
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


/**
 * export mdoules
 */
module.exports = {
	descProgram: descProgram,
	fetchImage: fetchImage,
};
