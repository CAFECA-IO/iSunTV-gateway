// Watching APIs (Business logic)
const axios = require('axios');
const util = require('util');

const mongodb = require('mongodb');
const dvalue = require('dvalue');

const ParentBot = require('./_Bot.js');
const AES = require('../utils/AES.js');


var logger;


var formatWatching = function (watching) {
	watching = dvalue.default(watching, {
		uid: "",
		pid: "",
		record: "",
		timing: 0,
		is_finished: false,
		atime: new Date().getTime()
	});
	return watching;
};

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
};

Bot.prototype.start = function () {

};

/************************************************
*                                               *
*        Watching APIs                          *
*                                               *
************************************************/
// recordWatchingProgram
// require: uid, pid, record, timing, is_finished
Bot.prototype.recordWatchingProgram = function (options, cb) {
	var self = this;
	options.is_finished = !!options.is_finished;

	// Check user
	var collection = self.db.collection('Programs');
	var cond = { pid: options.pid };
	collection.findOne(cond, {}, function (e, program) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!program) { e = new Error('Program not found'); e.code = '39201'; return cb(e); }
		else {
			// add bolt trust
			BOLTTrustAsset.call(self, { 'data': formatWatching(options) })

			// Update Watching_programs
			var criteria = { uid: options.uid, pid: options.pid };
			var update = { $set: formatWatching(options) };
			var updatedOptions = { upsert: true };
			var collection = self.db.collection('Watching_programs');
			collection.updateOne(criteria, update, updatedOptions, function(err, result){
				if(e) { e.code = '01002'; return cb(e); }
				cb(null, {});
			});
		}
	});
};

// listWatchedHistory
// require: options.uid */
Bot.prototype.listWatchedHistory = function (options, cb) {
	//list Watching_programs
	var query = { uid: options.uid };

	var pageOpt = Number(options.page);
	var limitOpt = Number(options.limit);
	var skip = pageOpt ? (pageOpt - 1) * limit : 0;
	var limit = limitOpt ? limitOpt : 0;
	this._listWatchedProgram(query, skip, limit, cb);
};

// listWatchedHistory
// require: options.uid */
Bot.prototype.listContinueWatching = function (options, cb) {
	//list Watching_programs
	var query = { uid: options.uid, is_finished: false };

	var pageOpt = Number(options.page);
	var limitOpt = Number(options.limit);
	var skip = pageOpt ? (pageOpt - 1) * limit : 0;
	var limit = limitOpt ? limitOpt : 0;
	this._listWatchedProgram(query, skip, limit, cb);
};

/**
 * util
 */
Bot.prototype._listWatchedProgram = function (query, skip, limit, cb) {
	var self = this;
	var collection = self.db.collection('Watching_programs');
	var sort = [['atime', -1]];
	collection.find(query, {_id: 0}).skip(skip).limit(limit).sort(sort).toArray(function (e, watchingPrograms) {
		if(e) { e.code = '01002'; return cb(e); }
		// merge programs
		var pids = watchingPrograms.map(function(program){ return program.pid });
		self.getBot('ResourceAgent').mergeByPrograms({ pids: pids }, function (err, programs) {
			var rs = watchingPrograms.map(function (watchingProgram) {
				var program = dvalue.search(programs, { pid : watchingProgram.pid });
				if(!program) { return undefined; }
				else { return dvalue.default(program, watchingProgram); }
			}).filter(function (v) { return v != undefined; });
			cb(null, rs);
		});
	});
}

function BOLTTrustAsset(data, count = 0) {
	const self = this

	// get user BOLT token
	var collection = self.db.collection('Users');
	const originData = Object.assign({}, data);
	
	collection.findOne({ _id: new mongodb.ObjectID(data.data.uid) })
	.then((item) => {
		let apiOptions = {
			method: 'POST',
			headers: { 'token': item.wallet.token || '' },
			url: self.config.boltPlatform.TrustUrl + '/asset',
		};
		axios(apiOptions)
		.then(async function (res) {
			if (res.data.code === 3) {
				const apiKeyDecrypt = AES.Decrypt(item.wallet.apiKey)
				const apiSecretDecrypt = AES.Decrypt(item.wallet.apiSecret)
				await axios.post(self.config.boltPlatform.PlatformUrl + '/createToken', {
					'apiKey': apiKeyDecrypt.apiKey,
					'apiSecret': apiSecretDecrypt.apiSecret,
				})
				.then(async function (res) {
					// save to db
					var criteria = { _id: new mongodb.ObjectID(data.data.uid) };
					var update = { $set: {
						'wallet.token': res.data.token,
						'wallet.tokenSecret': AES.Encrypt(res.data.tokenSecret),
					}};
					var updatedOptions = { upsert: true };
					var collection = self.db.collection('Users');
					collection.updateOne(criteria, update, updatedOptions, function(err, result){
						if(err) { 
							throw new Error('update db error:', err)
						}
					});
				})
				.catch(function (error) {
					console.error('get & set BOLT token err:', error);
				});
				throw new Error('Invalid token, create new & retry again')
			}
			else if (res.data.code === 5) {
				//  token expire, renew token
				const apiSecretDecrypt = AES.Decrypt(item.wallet.apiSecret)
				apiOptions = {
					method: 'POST',
					headers: { 'token': item.wallet.token },
					data: {
						tokenSecret: apiSecretDecrypt.tokenSecret
					},
					url: self.config.boltPlatform.PlatformUrl + '/renewToken',
				};
				await axios(apiOptions)
				.then(function (res) {
					item.wallet.token = res.data.token;
					item.wallet.tokenSecret = res.data.tokenSecret;
				})
				.catch(function (error) {
					console.error(error);
				});
				throw new Error('token expire, renew token & retry again')
			}
			return res.data.itemID
		})
		.then(async function (itemID) {
			// formatMetadata
			// find program name
			var collection = self.db.collection('Programs');
			const item = await collection.findOne({ pid: data.data.pid })

			delete data.data.record
			data.data = {
				'\nuid': data.data.uid,
				'\npid': data.data.pid,
				'\nprogram':  item.title || '',
				'\ntiming': data.data.timing,
				'\nis_finished': data.data.is_finished,
				'\natime': data.data.atime,
			}

			return itemID
		})
		.then(function (itemID) {
			apiOptions = {
				method: 'POST',
				headers: { 'token': item.wallet.token || '' },
				data,
				url: self.config.boltPlatform.TrustUrl  + '/asset/' + itemID + '/data',
			};
			
			axios(apiOptions)
			.then((item) => {
				// Update Watching_programs
				var criteria = { uid: data.data['\nuid'], pid: data.data['\npid'] };
				var update = { $set: { 'lightTxHash': item.data.receipt.lightTxHash } };
				var updatedOptions = { upsert: true };
				var collection = self.db.collection('Watching_programs');
				collection.updateOne(criteria, update, updatedOptions, function(e, result){
					if(e) {
						console.log('Update Watching_programs lightTxHash error:', e);
						throw e;
					}
				});
			})
			.catch(function (error) {
				console.error('BOLTTrustAsset saveData error:', error.message);
				if (count < 3) {
					setTimeout(() => {
						console.error('BOLTTrustAsset saveData error & retry ', count);
						BOLTTrustAsset.call(self, originData, count+=1)
					}, 1000);
				}
			});
		})
		.catch(function (error) {
			console.error('BOLTTrustAsset create error:', error.message);
			if (count < 3) {
				setTimeout(() => {
					console.error('BOLTTrustAsset create error & retry ', count);
					BOLTTrustAsset.call(self, originData, count+=1)
				}, 1000);
			}
		});
	})
	.catch((e) => {
		// can't found user in db
		console.log('can\'t found user in db, error:', e);
	})
}

module.exports = Bot;
