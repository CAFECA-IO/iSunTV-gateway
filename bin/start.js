#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const url = require('url');
const path = require('path');
const log4js = require('log4js');
const dvalue = require('dvalue');
const mongodb = require('mongodb').MongoClient;

// initial folder
var initFolder = function (name) {
  var homepath = path.join(process.env.HOME || process.env.USERPROFILE, name);
  var upload = path.join(homepath, "uploads/");
  var logs = path.join(homepath, "logs/");
  var dataset = path.join(homepath, "dataset/");
  var tmp = path.join(homepath, "tmp/");
  var pathPID = path.join(homepath, "PID");

  if (!fs.existsSync(homepath)) { fs.mkdirSync(homepath); }
  if (!fs.existsSync(upload)) { fs.mkdirSync(upload); }
  if (!fs.existsSync(logs)) { fs.mkdirSync(logs); }
  if (!fs.existsSync(tmp)) { fs.mkdirSync(tmp); }

  var rs = {
    home: homepath,
    upload: upload,
    logs: logs,
    dataset: dataset,
    tmp: tmp,
    PID: pathPID
  };

  return rs;
};

// initial logger
var initLogger = function (logPath) {
  var infoPath = path.join(logPath, 'info.log');
  var exceptionPath = path.join(logPath, 'exception.log');
  var threatPath = path.join(logPath, 'threat.log');
  log4js.configure({
    "appenders": [
      { "type": "console" },
      { "type": "file", "filename": infoPath, "category": "info", "maxLogSize": 10485760, "backups": 365 },
      { "type": "file", "filename": exceptionPath, "category": "exception", "maxLogSize": 10485760, "backups": 10 },
      { "type": "file", "filename": threatPath, "category": "threat", "maxLogSize": 10485760, "backups": 10 }
    ],
    "replaceConsole": true
  });
  var logger = {
    info: log4js.getLogger('info'),
    exception: log4js.getLogger('exception'),
    threat: log4js.getLogger('threat')
  };

  return logger;
}

// create PID file
var initPID = function (homepath) {
  var PID = process.pid;
  var pathPID = path.join(homepath, 'PID');
  fs.writeFile(pathPID, PID, function(err) {});
  return PID;
};

var initUUID = function (homepath) {
  var pathUUID = path.join(homepath, 'UUID');
  var UUID = dvalue.guid();
  if(!fs.existsSync(pathUUID)) {
    fs.writeFile(pathUUID, UUID, function(err) {});
  }
  else {
    UUID = fs.readFileSync(pathUUID).toString();
  }
  return UUID;
};

// loadConfig
var loadConfig = function () {
  var config = require('../config/');
  var packageInfo = require('../package.json');

  config.path = initFolder(packageInfo.name);
  config.logger = initLogger(config.path.logs);
  config.PID = initPID(config.path.home);
  config.UUID = initUUID(config.path.home);
  config.package = {
    name: packageInfo.name,
    version: packageInfo.version
  };
  config.powerby = packageInfo.name + " v" + packageInfo.version;
  return config;
};

// connect database
var connectDB = function (options, cb) {
  options = dvalue.default(options, {});
  switch (options.type) {
    case 'mongodb':
      var path;
      if(options.user && options.password) {
        var tmpURL = url.parse(options.path);
        tmpURL.auth = dvalue.sprintf('%s:%s', options.user, options.password);
        path = url.format(tmpURL);
      }
      else {
        path = options.path;
      }
      mongodb.connect(path, cb);
      break;
    default:
      var DB = require('tingodb')().Db;
      db = new DB(dataset, {});
      cb(null, db);
  }
};

// start all bot
var botFolder = path.join(__dirname, "../bots");
var files = fs.readdirSync(botFolder);
var bots = [];
var getBot = function (name) {
  var rs;
  for(var i in bots) {
    if(bots[i].name.toLowerCase() == name.toLowerCase()) { return bots[i]; }
  }
};
var startBot = function (config) {
  connectDB(config.db, function (e, db) {
    var sub = "js";
    var reg = new RegExp('\.' + sub + '$');
    for(var key in files) {
      if(reg.test(files[key]) && files[key].indexOf("_") == -1) {
        var Bot = require(path.join(botFolder, files[key]));
        var bot = new Bot(config);
        bots.push(bot);
        bot.name = files[key].split('.' + sub)[0];
        bot.db = db;
        bot.getBot = getBot;
      }
    }

    bots.map(function (b) {
      b.start();
    });
  });
};

var config = loadConfig();
startBot(config);
