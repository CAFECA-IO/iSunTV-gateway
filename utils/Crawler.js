// Crawler
const http = require('http');
const https = require('https');
const url = require('url');

const dvalue = require('dvalue');


var request = function (options, cb) {
	var operator;
	var retry = function (rOptions, rCb) {
		if(rOptions.retry > 3) { return false; }
		rOptions.retry = rOptions.retry > 0? rOptions.retry + 1: 1;
		setTimeout(function () {
			request(rOptions, rCb);
		}, Math.random() * 1000);
		return true;
	};
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
					try {
						rs.data = JSON.parse(rs.data);
					}
					catch(e) {
						if(!retry(options, cb)) { return cb(e); }
						return; 
					}
					break;
			}
			cb(null, rs)
		})
	});
	crawler.on('error', function (e) {
		if(!retry(options, cb)) { return cb(e); }
	})
	if(options.post) {crawler.write(JSON.stringify(options.post));}
	crawler.end();
};

/**
 * export mdoules
 */
module.exports = {
	request: request,
};
