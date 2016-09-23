const ParentBot = require('./_Bot.js');
const util = require('util');
const log4js = require('log4js');
const express = require('express');
const Session = require('express-session');
const favicon = require('serve-favicon');
const os = require('os');
const exec = require('child_process').exec;
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const multer = require('multer');
const http = require('http');
const https = require('https');
const echashcash = require('echashcash');
const ecresult = require('ecresult');
const dvalue = require('dvalue');
const textype = require('textype');

const hashcashLevel = 3;
const allowDelay = 10000 * 1000;


var pathCert = path.join(__dirname, '../config/cert.pfx'),
		pathPw = path.join(__dirname, '../config/pw.txt'),
		logger;

var checkLogin, checkHashCash, errorHandler, returnData;
checkLogin = function (req, res, next) {
	if(req.session.uid === undefined) {
		res.result.setErrorCode('10201');
		res.result.setMessage('User Not Authorized');
		returnData(req, res, next)
	}
	else {
		next();
	}
};
checkHashCash = function (req, res, next) {
	var invalidHashcash = function () {
		//-- for test
		var t, h = req.headers.hashcash, nt = new Date().getTime();
		if(h) { t = parseInt(h.split(":")[0]) || nt; }
		var c = [req.url, nt, ""].join(":");
		var hc = echashcash(c);
		var d = {
			hashcash: req.headers.hashcash,
			sample: [nt, hc].join(":")
		};
		if(new Date().getTime() - t > allowDelay) { d.information = "timeout"; }
		if(new Date().getTime() < t) { d.information = "future time"; }

		res.result.setErrorCode('10101');
		res.result.setMessage('Invalid Hashcash');
		res.result.setData(d);  //-- for test
		returnData(req, res, next);
	};

	var hashcash = req.headers.hashcash;
	if(!hashcash) { return invalidHashcash(); }
	var cashdata = hashcash.split(":");
	cashdata = cashdata.map(function (v) { return parseInt(v) || 0; });
	var content = [req.url, cashdata[0], ""].join(":");
	var now = new Date().getTime();
	var check = now - cashdata[0] < allowDelay? echashcash.check(content, cashdata[1], hashcashLevel): false;
	if(check) {
		next();
	}
	else { return invalidHashcash(); }
};
errorHandler = function (err, req, res, next) {
	logger.exception.error(err);
	if(!res.finished) {
		try {
			res.statusCode = 500;
			res.result.setMessage('oops, something wrong...');
			res.send(res.result.response());
		}
		catch(e) {}
	}
};
returnData = function(req, res, next) {
	var session, json, isFile, isURL;

	if(!res.finished) {
		json = res.result.response();
		isFile = new RegExp("^[a-zA-Z0-9\-]+/[a-zA-Z0-9\-\.]+$").test(json.message);
		isURL = textype.isURL(json.message);
		if(res.result.isDone()) {
			session = res.result.getSession();

			for(var key in session) {
				if(session[key] === null) {
					delete req.session[key];
				}
				else {
					req.session[key] = session[key];
				}
			}
		}
		else {
			res.status(404);
			res.result.setMessage("Invalid operation");
		}

		if(isFile) {
			res.header('Content-Type', json.message);
			res.end(json.data);
		}
		else if(isURL) {
			var crawler;
			var options = url.parse(json.message);
			options.method = 'GET';
			switch(options.protocol) {
				case 'http:':
					crawler = http;
					break;
				case 'https:':
				default:
					crawler = https;
					options.rejectUnauthorized = false;
			}
			crawler.request(options, function (cRes) {
				res.header('Content-Type', cRes.headers['content-type']);
				cRes.on('data', function (chunk) {
					res.write(chunk);
				});
				cRes.on('end', function () {
					res.end();
				})
			}).on('error', function (e) { res.end(); }).end();
		}
		else if(json.result >= 100) {
			res.status(json.result);
			for(var key in json.data) {
				res.header(key, json.data[key]);
			}

			res.end();
		}
		else {
			res.header("Content-Type", 'application/json');
			res.send(json);
		}
	}
	else {
		// timeout request
		json = res.result.response();
		res.result.resetResponse();
	}
	if(json.errorcode) {
		logger.exception.warn('----- request -----');
		logger.exception.warn(req.method, req.url);
		logger.exception.warn('session:', req.headers);
		logger.exception.warn('session:', req.session);
		logger.exception.warn('params:', req.params);
		logger.exception.warn('query:', req.query);
		logger.exception.warn('body:', req.body);
		logger.exception.warn('-------------------');
	}

	var rs = json.errorcode? [json.result, json.errorcode].join(':'): json.result;
	logger.info.info(req.method, req.url, rs, req.session.ip, json.cost);
};

var Bot = function(config) {
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function(config) {
	var self = this;
	Bot.super_.prototype.init.call(this, config);
	this.serverPort = [5566, 80];
	this.httpsPort = [7788, 443];
	this.nodes = [];
	this.monitorData = {};
	this.monitorData.traffic = {in: 0, out: 0};
	logger = config.logger;

	var folders = config.path || {};
	var upload = folders.upload || "./uploads/";
	var shards = folders.shards || "./shards/";
	this.shardPath = shards;
	var logs = folders.logs || "./logs/";
	var passportBot = this.getBot("Passport");
	var jobQueue = this.getBot("JobQueue");

	this.router = express.Router();
	this.app = express();
	this.http = require('http').createServer(this.app);
	this.http.on('error', function(err) {
		if(err.syscall == 'listen') {
			var nextPort = self.serverPort.pop() || self.listening + 1;
			self.startServer(nextPort);
		}
		else {
			throw err;
		}
	});
	this.http.on('listening', function() {
		config.listening = self.listening;
		logger.info.info('HTTP:', self.listening);
	});

	// if has pxf -> create https service
	if(fs.existsSync(pathCert)) {
		this.pfx = fs.readFileSync(pathCert);
		this.pfxpw = fs.readFileSync(pathPw);

		this.https = require('https').createServer({
			pfx: this.pfx,
			passphrase: this.pfxpw
		}, this.app);
		this.https.on('error', function(err) {
			if(err.syscall == 'listen') {
				var nextPort = self.httpsPort.pop() || self.listeningHttps + 1;
				self.startServer(null, nextPort);
			}
			else {
				throw err;
			}
		});

		this.https.on('listening', function() {
			config.listeningHttps = self.listeningHttps;
			logger.info.info('HTTPS:', self.listeningHttps);
		});
	}

	this.session = Session({
		secret: this.randomID(),
		resave: true,
		saveUninitialized: true
	});

	this.app.set('port', this.serverPort.pop());
	this.app.set('portHttps', this.httpsPort.pop());
	this.app.use(this.session);
	this.app.use('/auth/*', passportBot.initialize);
	this.app.use(express.static(path.join(__dirname, '../public')));
	this.app.use('/resources/', express.static(path.join(__dirname, '../resources')));
	this.app.use(bodyParser.urlencoded({ extended: false }));
	this.app.use(bodyParser.json({}));
	this.app.use(function(req, res, next) { self.filter(req, res, next); });
	this.app.use(jobQueue.middleware());
	this.app.use(this.router);
	this.app.use(returnData);
	this.ctrl = [];

	// HOME
	this.router.get('/', function (req, res, next) {
		res.result.setResult(1);
		res.result.setMessage('Application Information');
		res.result.setData(self.config.package);
		next();
	});

	// get system infomation
	this.router.get('/version/', function (req, res, next) {
		res.result.setResult(1);
		res.result.setMessage('Application Information');
		res.result.setData(self.config.package);
		next();
	});

	// get command Result
	this.router.get('/command/:id', checkHashCash, function (req, res, next) {
		var commandID = req.params.id;
		var options = {attr: {command: commandID}};
		var rs = jobQueue.findJob(options);
		if(rs) {
			res.result = rs;
			rs.resetResponse();
		}
		else {
			res.result.setErrorCode('00002');
			res.result.setMessage('command not found:', commandID);
		}
		next();
	});

	// timeout test
	this.router.get('/wait/:timeout', function (req, res, next) {
		var t = parseInt(req.params.timeout) || 0;
		setTimeout(function () {
			res.result.setResult(1);
			res.result.setMessage('waiting test:', t);
			next();
		}, t);
	});
	// session data
	this.router.get('/session', function (req, res, next) {
		res.result.setResult(1);
		res.result.setMessage('session data');
		res.result.setData(req.session);
		next();
	});

	// user profile
	this.router.get('/profile', checkLogin, function (req, res, next) {
		var bot = self.getBot('User');
		var condition = {uid: req.session.uid};
		bot.getProfile(condition, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('user profile');
				res.result.setData(d);
			}
			next();
		});
	});
	// user photo
	this.router.get('/profile/:uid/photo', function (req, res, next) {
		var bot = self.getBot('User');
		var condition = {uid: req.params.uid};
		bot.getUserPhoto(condition, function (e, d) {
			if(e) {
				res.result.setResult(1);
				res.result.setMessage('https://scontent.xx.fbcdn.net/v/t1.0-1/c15.0.50.50/p50x50/10354686_10150004552801856_220367501106153455_n.jpg?oh=5c43cf5cfa35da8de30688b57a56d839&oe=5824062F');
			}
			else {
				res.result.setResult(1);
				res.result.setMessage(d.mimetype);
				res.result.setData(d.binary);
			}
			next();
		});
	});
	// user register
	this.router.post('/register', checkHashCash, function (req, res, next) {
		var user = {
			account: req.body.email,
			email: req.body.email,
			password: req.body.password,
			allowmail: !!req.body.allowmail
		};
		var bot = self.getBot('User');
		bot.addUser(user, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('user register');
				res.result.setData(d);
				res.result.setSession({uid: d.uid});
			}
			next();
		});
	});
	// registrable account
	this.router.get('/registrable/:account', checkHashCash, function (req, res, next) {
		var options = {account: req.params.account};
		var bot = self.getBot('User');
		bot.accountRegistable(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('registrable account:', req.params.account);
			}
			next();
		});
	});
	// resend verify email
	this.router.get('/resend', checkLogin, function (req, res, next) {
		var options = { uid: req.session.uid };
		var bot = self.getBot('User');
		bot.sendVericicationMail(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Resend verify code');
			}
			next();
		});
	});
	this.router.get('/resend/:email', checkHashCash, function (req, res, next) {
		var options = { email: req.params.email, uid: req.session.uid };
		var bot = self.getBot('User');
		bot.sendVericicationMail(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Resend verify code');
			}
			next();
		});
	});
	// user verification
	this.router.get('/register/:account/:validcode', function (req, res, next) {
		var user = {account: req.params.account, validcode: req.params.validcode};
		var bot = self.getBot('User');
		bot.emailVerification(user, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('user verification');
				res.result.setData({uid: d.uid});
				res.result.setSession({uid: d.uid});
			}
			next();
		});
	});
	// user verification with url
	this.router.get('/register/:account/:validcode/redirect', function (req, res, next) {
		var user = {account: req.params.account, validcode: req.params.validcode};
		var bot = self.getBot('User');
		bot.emailVerification(user, function (e, d) {
			res.result.setResult(302);
			if(e) {
				var vrsUrl = url.resolve(self.config.frontend, '/zh/validate?result=failed');
			}
			else {
				var vrsUrl = url.resolve(self.config.frontend, '/zh/validate?result=success');
			}
			res.result.setData({Location: vrsUrl});
			next();
		});
	});
	// user login
	this.router.post('/login', checkHashCash, function (req, res, next) {
		var user = {account: req.body.account || req.body.email, password: req.body.password};
		var bot = self.getBot('User');
		bot.login(user, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				res.result.setData({uid: e.uid});
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('login successfully');
				res.result.setData(d);
				res.result.setSession({uid: d.uid});
			}
			next();
		});
	});
	// user logout
	this.router.get('/logout', function (req, res, next) {
		res.result.setResult(1);
		res.result.setMessage('logout successfully');
		res.result.setSession({uid: null});
		next();
	});
	this.router.get('/logout/:token', function (req, res, next) {
		var token = req.params.token;
		var bot = self.getBot('User');
		bot.destroyToken(token, function () {});
		res.result.setResult(1);
		res.result.setMessage('logout successfully');
		res.result.setSession({uid: null});
		next();
	});
	// renew token
	this.router.get('/renew/:token/:renew', function (req, res, next) {
		var token = {token: req.params.token, renew: req.params.renew};
		var bot = self.getBot('User');
		bot.renew(token, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('token renew');
				res.result.setData(d);
			}
			next();
		});
	});
	// forget password
	this.router.post('/password/forget', checkHashCash, function (req, res, next) {
		var user = {email: req.body.email, language: req.language};
		var bot = self.getBot('User');
		bot.forgetPassword(user, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('request change password');
				res.result.setData(d);
			}
			next();
		});
	});
	// check reset password
	this.router.get('/password/reset/:uid/:resetcode', checkHashCash, function (req, res, next) {
		var options = {
			uid: req.params.uid,
			resetcode: req.params.resetcode,
		};
		var bot = self.getBot('User');
		bot.checkResetPassword(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('password reset code is valid');
			}
			next();
		});
	});
	// reset password
	this.router.put('/password/reset/:uid', checkHashCash, function (req, res, next) {
		var options = {
			uid: req.params.uid,
			resetcode: req.body.resetcode,
			password: req.body.password
		};
		var bot = self.getBot('User');
		bot.resetPassword(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('successful password reset');
				res.result.setData(d);
			}
			next();
		});
	});
	// change password
	this.router.put('/password/', checkLogin, function (req, res, next) {
		var user = {
			uid: req.session.uid,
			password_old: req.body.password_old,
			password_new: req.body.password_new
		};
		var bot = self.getBot('User');
		bot.changePassword(user, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('successful password change');
				res.result.setData(d);
			}
			next();
		});
	});

	// passport
	this.router.get('/auth/facebook', function (req, res, next) { passportBot.facebook_authenticate(req, res, next); });
	this.router.get('/auth/facebook/callback', function (req, res, next) { passportBot.facebook_callback(req, res, next); });
	this.router.get('/auth/facebook/token/:access_token', checkHashCash, function (req, res, next) { passportBot.facebook_token(req, res, next); });

	// channel list
	this.router.get('/channel/', function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {};
		bot.listChannel(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Live Channel List');
				res.result.setData(d);
			}
			next();
		});
	});
	// channel information
	this.router.get('/channel/:channel', function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {cid: req.params.channel, time: req.query.time, days: req.query.days, period: req.query.period};
		bot.descChannel(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Channel Information:', d.title);
				res.result.setData(d);
			}
			next();
		});
	});
	// channel stream data
	this.router.get('/channel/:channel/*', function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var skip = new RegExp('^/channel/' + req.params.channel);
		var resource = {
			channel: req.params.channel,
			path: req.path.replace(skip, '')
		};
		if(resource.path == '/streaming.m3u8') {
			bot.parseChannel(resource, function (e, d) {
				if(e) {
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
					logger.exception.warn(e);
				}
				else {
					res.result.setResult(302);
					res.result.setData({Location: d});
				}
				next();
			});
		}
		else {
			bot.channelResource(resource, function (e, d) {
				if(e) {
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
					logger.exception.warn(e);
				}
				else {
					res.result.setResult(1);
					res.result.setMessage(d);
					/*
					if(path.parse(d).ext == '.m3u8') {
					}
					else {
						res.result.setResult(302);
						res.result.setData({Location: d});
					}
					*/
				}
				next();
			});
		}
	});

	/* program */
	// list PIDs
	this.router.get('/program/', checkHashCash, function (req, res, next) {
		self.getBot('ResourceAgent').listPID({}, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Program List');
				res.result.setData(d);
			}
			next();
		});
	});

	// Banner programs
	this.router.get(['/banner', '/banner/:page', '/banner/:page/:limit'], function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {page: req.params.page, limit: req.params.limit};
		bot.listBannerProgram(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Banner Programs List');
				res.result.setData(d);
			}
			next();
		});
	});
	// Featured programs
	this.router.get(['/featured', '/featured/:page', '/featured/:page/:limit'], function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {page: req.params.page, limit: req.params.limit, uid: req.session.uid};
		bot.listFeaturedProgram(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Featured Programs List');
				res.result.setData(d);
			}
			next();
		});
	});
	// Series List
	this.router.get(['/series', '/series/:page', '/series/:page/:limit'], function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {page: req.params.page, limit: req.params.limit, uid: req.session.uid};
		bot.listSeries(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Series List');
				res.result.setData(d);
			}
			next();
		});
	});
	// Series Programs List
	this.router.get(['/series/programs/:sid', '/series/programs/:sid/:page', '/series/programs/:sid/:page/:limit'], function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {sid: req.params.sid, page: req.params.page, limit: req.params.limit, uid: req.session.uid};
		bot.getSeriesProgram(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Series Programs List');
				res.result.setData(d);
			}
			next();
		});
	});
	// Special Series List
	this.router.get(['/special/series', '/special/series/:page', '/special/series/:page/:limit'], function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {sid: req.params.sid, page: req.params.page, limit: req.params.limit, uid: req.session.uid};
		bot.getSpecialSeries(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Special Series List');
				res.result.setData(d);
			}
			next();
		});
	});
	// List Program Type
	this.router.get('/programtype/', function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {};
		bot.listPrgramType(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('list program type');
				res.result.setData(d);
			}
			next();
		});
	});
	// List Program By Type
	this.router.get(['/programtype/:ptid', '/programtype/:ptid/:page', '/programtype/:ptid/:page/:limit'], function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {uid: req.session.uid, ptid: req.params.ptid, page: req.params.page, limit: req.params.limit};
		bot.listProgramByType(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('list program type');
				res.result.setData(d);
			}
			next();
		});
	});
	// Search Program
	this.router.get(['/search/:keyword', '/search/:keyword/:page', '/search/:keyword/:page/:limit'], checkHashCash, function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {uid: req.session.uid, keyword: req.params.keyword, page: req.params.page, limit: req.params.limit};
		bot.searchPrograms(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('search program');
				res.result.setData(d);
			}
			next();
		});
	});
	// Relative Program
	this.router.get(['/relative/:pid'], checkHashCash, function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {pid: req.params.pid, uid: req.session.uid};
		bot.fetchRelativePrograms(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('relative programs');
				res.result.setData(d);
			}
			next();
		});
	});
	// GET Program
	this.router.get('/program/:pid', function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {pid: req.params.pid, uid: req.session.uid};
		bot.getProgramFromDB(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Program:', req.params.pid);
				res.result.setData(d);
			}
			next();
		});
	});
	// GET Program Play Data
	this.router.get('/program/:pid/playdata', function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {pid: req.params.pid, uid: req.session.uid};
		bot.getProgramPlayData(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Play Data:', req.params.pid);
				res.result.setData(d);
			}
			next();
		});
	});

	// GET Latest Programs
	this.router.get(['/latest/program/', '/latest/program/:page', '/latest/program/:page/:limit'], function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {uid: req.session.uid, page: req.params.page, limit: req.params.limit};
		bot.getLatestProgram(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Latest Programs List');
				res.result.setData(d);
			}
			next();
		});
	});

	/* comments */
	// write comment
	this.router.post('/program/:pid/comment/', checkLogin, function (req, res, next) {
		var bot = self.getBot('Comment');
		var options = {uid: req.session.uid, pid: req.params.pid, rating: req.body.rating, title: req.body.title, comment: req.body.comment};
		bot.writeComment(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('write comment');
				res.result.setData(d);
			}
			next();
		});
	});
	// delete comment
	this.router.delete('/program/:pid/comment/', checkLogin, function (req, res, next) {
		var bot = self.getBot('Comment');
		var options = {uid: req.session.uid, pid: req.params.pid};
		bot.deleteCommentByPID(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('delete comment');
				res.result.setData(d);
			}
			next();
		});
	});

	// delete comment
	this.router.delete('/comment/:cmid', checkLogin, function (req, res, next) {
		var bot = self.getBot('Comment');
		var options = {uid: req.session.uid, cmid: req.params.cmid};
		bot.deleteComment(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('delete comment');
				res.result.setData(d);
			}
			next();
		});
	});

	// verify comment
	this.router.put('/comment/:cmid/verify', checkLogin, function (req, res, next) {
		var bot = self.getBot('Comment');
		var options = {uid: req.session.uid, cmid: req.params.cmid};
		bot.verifyComment(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('verify comment');
				res.result.setData(d);
			}
			next();
		});
	});

	// list program comment
	// /program/{$pid}/comment/{$page}/{$limit}
	this.router.get(['/program/:pid/comment', '/program/:pid/comment/:page', '/program/:pid/comment/:page/:limit'], function (req, res, next) {
		var bot = self.getBot('Comment');
		var options = {uid: req.session.uid, pid: req.params.pid, page: req.params.page, limit: req.params.limit};
		bot.listProgramComments(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('list comment');
				res.result.setData(d);
			}
			next();
		});
	});

	// list user comment
	// /mycomment/{$page}/{$limit}
	this.router.get(['/mycomment', '/mycomment/:page', '/mycomment/:page/:limit'], checkLogin, function (req, res, next) {
		var bot = self.getBot('Comment');
		var options = {uid: req.session.uid, page: req.params.page, limit: req.params.limit};
		bot.listUserComments(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('list comment');
				res.result.setData(d);
			}
			next();
		});
	});

	/* Favorite */
	// Add favorite
	this.router.post('/program/:pid/favorite', checkLogin, function (req, res, next) {
		var bot = self.getBot('Favorite');
		var options = {uid: req.session.uid, pid: req.params.pid};
		bot.addFavorite(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Add to favorite:', req.params.pid);
				res.result.setData(d);
			}
			next();
		});
	});
	// Remove favorite
	this.router.delete('/program/:pid/favorite', checkLogin, function (req, res, next) {
		var bot = self.getBot('Favorite');
		var options = {uid: req.session.uid, pid: req.params.pid};
		bot.removeFavorite(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Remove to favorite:', req.params.pid);
				res.result.setData(d);
			}
			next();
		});
	});
	// List my favorite
	this.router.get(['/favorite', '/favorite/:page', '/favorite/:page/:limit'], checkLogin, function (req, res, next) {
		var bot = self.getBot('Favorite');
		var options = {uid: req.session.uid, page: req.params.page, limit: req.params.limit};
		bot.listFavorite(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('List my favorite');
				res.result.setData(d);
			}
			next();
		});
	});
	// Record watching
	this.router.post('/program/:pid/watching', checkLogin, function (req, res, next) {
		var bot = self.getBot('Watching');
		var options = {
			uid: req.session.uid,
			pid: req.params.pid,
			record: req.token || req.sessionID,
			timing: req.body.timing,
			is_finished: req.body.is_finished,
		};
		bot.recordWatchingProgram(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Record Watching:', req.params.pid);
				res.result.setData(d);
			}
			next();
		});
	});
	// List watched history
	this.router.get(['/watched', '/watched/:page', '/watched/:page/:limit'], checkLogin, function (req, res, next) {
		var bot = self.getBot('Watching');
		var options = {uid: req.session.uid, page: req.params.page, limit: req.params.limit};
		bot.listWatchedHistory(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('List watched history');
				res.result.setData(d);
			}
			next();
		});
	});
	// list Continue Watching
	this.router.get(['/watching', '/watching/:page', '/watching/:page/:limit'], checkLogin, function (req, res, next) {
		var bot = self.getBot('Watching');
		var options = {uid: req.session.uid, page: req.params.page, limit: req.params.limit};
		bot.listContinueWatching(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('List continue watching');
				res.result.setData(d);
			}
			next();
		});
	});
	// list Rent Programs
	this.router.get(['/myprogram', '/myprogram/:page', '/myprogram/:page/:limit'], checkLogin, function (req, res, next) {
		var bot = self.getBot('ResourceAgent');
		var options = {uid: req.session.uid, page: req.params.page, limit: req.params.limit};
		bot.listRentPrograms(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('List rent programs');
				res.result.setData(d);
			}
			next();
		});
	});
	// user profile
	this.router.put('/profile', checkLogin, multer({ dest: self.config.path.upload }).any(), function (req, res, next) {
		var bot = self.getBot('User');
		var options = { uid: req.session.uid, username: req.body.username };
		if (req.files) options.photo = req.files[0];
		bot.updateProfile(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Update profile');
				res.result.setData(d);
			}
			next();
		});
	});

	/* payment plans */
	// order
	this.router.post('/order', checkLogin, function (req, res, next) {
		var bot = self.getBot('Payment');
		var options = {uid: req.session.uid, ppid: req.body.ppid, pid: req.body.pid};
		bot.order(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('order plan:', options.ppid);
				res.result.setData(d);
			}
			next();
		});
	});
	// checkout
	this.router.post(['/checkout', '/checkout/:gateway'], checkLogin, function (req, res, next) {
		var bot = self.getBot('Payment');
		var options = {uid: req.session.uid, oid: req.body.oid, ppid: req.body.ppid, pid: req.body.pid, nonce: req.body.nonce || req.body.payment_method_nonce, gateway: req.params.gateway, receipt: req.body.receipt, transaction: req.body.transaction};
		bot.checkoutTransaction(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('checkout payment:', options.oid);
				res.result.setData(d);
			}
			next();
		});
	});
	// cancel subscribe
	this.router.delete('/subscribe', checkLogin, function (req, res, next) {
		var options = {uid: req.session.uid};
		self.getBot('Payment').cancelSubscribe(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('cancel subscribe');
			}
			next();
		});
	});
	// subscribe manual renew
	this.router.post(['/subscribe/renew', '/subscribe/renew/:gateway'], checkLogin, function (req, res, next) {
		var options = {uid: req.session.uid, gateway: req.params.gateway, receipt: req.body.receipt, transaction: req.body.transaction};
		self.getBot('Payment').manualRenew(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('renew subscribe');
			}
			next();
		});
	});
	// list payment plan
	this.router.get('/paymentplans', function (req, res, next) {
		var options = {};
		self.getBot('Payment').listPaymentPlans(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('payment plans list');
				res.result.setData(d);
			}
			next();
		});
	});
	// list bill
	this.router.get('/billing', checkLogin, function (req, res, next) {
		var options = {uid: req.session.uid};
		self.getBot('Payment').billingList(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('billing list');
				res.result.setData(d);
			}
			next();
		});
	});
	// survey
	this.router.post('/survey/:topic', checkLogin, function (req, res, next) {
		var options = {uid: req.session.uid, topic: req.params.topic, data: req.body};
		self.getBot('Survey').add(options, function (e, d) {
			if(e) {
				res.result.setErrorCode(e.code);
				res.result.setMessage(e.message);
				logger.exception.warn(e);
			}
			else {
				res.result.setResult(1);
				res.result.setMessage('Thank you for sharing your opinion');
			}
			next();
		});
	});
};

Bot.prototype.start = function(cb) {
	Bot.super_.prototype.start.apply(this);
	var self = this;
	var httpPort = this.app.get('port');
	var httpsPort = this.app.get('portHttps');
	this.router.use(errorHandler);
	this.startServer(httpPort, httpsPort, cb);
};

Bot.prototype.startServer = function(port, httpsPort, cb) {
	if(port > 0) {
		this.listening = port;
		this.http.listen(port, function() {
				if(typeof(cb) == 'function') { cb(); }
		});
	}

	if(httpsPort > 0 && this.pfx) {
		this.listeningHttps = httpsPort;
		this.https.listen(httpsPort, function() {});
	}
}

Bot.prototype.stop = function() {
	Bot.super_.prototype.stop.apply(this);
	this.http.close();

	if(this.pfx) {
		this.https.close();
	}
};

Bot.prototype.filter = function (req, res, next) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '0.0.0.0';
	var port = req.connection.remotePort;
	parseIP = ip.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/);
	ip = !!parseIP? parseIP[0]: ip;
	if(!req.session.ip) { req.session.ip = ip; }
	if(!req.session.port) { req.session.port = port; }
	var powerby = this.config.powerby;

	var processLanguage = function (acceptLanguage) {
		var regex = /((([a-zA-Z]+(-[a-zA-Z]+)?)|\*)(;q=[0-1](\.[0-9]+)?)?)*/g;
		var l = acceptLanguage.toLowerCase().replace(/_+/g, '-');
		var la = l.match(regex);
		la = la.filter(function (v) {return v;}).map(function (v) {
			var bits = v.split(';');
			var quality = bits[1]? parseFloat(bits[1].split("=")[1]): 1.0;
			return {locale: bits[0], quality: quality};
		}).sort(function (a, b) { return b.quality > a.quality; });
		return la;
	};
	req.language = processLanguage(req.headers['accept-language'] || 'en-US');

	res.result = new ecresult();
	res.header('X-Powered-By', powerby);
	res.header('Client-IP', ip);
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
	res.header("Access-Control-Allow-Headers", "Hashcash, Authorization, Content-Type");

	var bot = this.getBot('User');
	var auth = req.headers.authorization;
	var token = !!auth? auth.split(" ")[1]: '';
	bot.checkToken(token, function (e, d) {
		if(!!d) {
			req.session.uid = d.uid;
			req.token = token;
		}
		next();
	});
};
Bot.prototype.tokenParser = function (req, res, next) {
	var auth = req.headers.authorization;
	var token = !!auth? auth.split(" ")[1]: '';
	bot.checkToken(token, function (e, d) {
		if(!!d) {
			req.session.uid = d.uid;
		}
		next();
	});
};

module.exports = Bot;
