const ParentBot = require('./_Bot.js');
const util = require('util');
const dvalue = require('dvalue');

const requestTimeout = 3000;
const gc = 3600000;

var logger;

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
  Bot.super_.prototype.init.call(this, config);
  this.queue = [];
  logger = config.logger;
};

Bot.prototype.start = function () {
  var self = this;
  setInterval(function () {
    self.gc();
  }, gc);
};

Bot.prototype.middleware = function () {
  var self = this;
  return function () {
    self.middlewareProcess.apply(self, arguments);
  }
};
Bot.prototype.middlewareProcess = function (req, res, next) {
  var self = this;
  setTimeout(function () {
    if(res.finished) { return; }
    self.addJob(res.result);
    res.result.setResult(2);
    res.result.setMessage('still processing');
    res.json(res.result.toJSON());
    logger.info.warn(req.method, req.url, 'timeout', req.session.ip);

    res.result.resetError();
  }, requestTimeout);
  next();
};

Bot.prototype.addJob = function (job) {
  var id = dvalue.guid();
  job.setCommand(id);
  this.queue.push(job);
};
Bot.prototype.findJob = function (options) {
  if(typeof(options) != 'object') {
    options = {attr: {command: options}};
  };
  return dvalue.search(options, this.queue);
};
Bot.prototype.gc = function () {
  var expire = new Date().getTime() - gc;
  for (var k = this.queue.length - 1; k >= 0; k--) {
    if(this.queue[k].isEnd() && this.queue[k].isExpire(expire)) {
      this.queue.splice(k, 1);
    }
  }
};

module.exports = Bot;
