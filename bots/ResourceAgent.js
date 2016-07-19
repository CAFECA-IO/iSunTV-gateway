const ParentBot = require('./_Bot.js');
const util = require('util');
const url = require('url');
const path = require('path');
const dvalue = require('dvalue');

var logger;

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

Bot.prototype.parseChannel = function (resource, cb) {
  var channel = dvalue.search({id: resource.channel}, this.channels);
  if(channel === undefined) {
    var channel = {id: resource.channel, url: 'http://vodcdn.newsun.tv/vod/WoDiJiaRen_07.m3u8'};
    var link = 'http://vodcdn.newsun.tv/vod/WoDiJiaRen_07.m3u8';
    channel.path = path.parse(channel.url).dir;
    this.channels.push(channel)
    cb(null, link);
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
  }
  else {
    var link, tmp = url.parse(channel.path);
    tmp.pathname = path.join(tmp.path, resource.path);
    var link = url.format(tmp);
    cb(null, link);
  }
};

module.exports = Bot;
