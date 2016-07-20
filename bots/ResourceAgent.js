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
	crawler.write(JSON.stringify(options.post));
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

Bot.prototype.descChannel = function (resource, cb) {

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

Bot.prototype.request = request;

module.exports = Bot;
