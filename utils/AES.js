const crypto = require('crypto');
const config = require('../config/');
const iv = new Buffer(config.aes.iv);
const key = config.aes.key;
  
// Encrypted to AES 256 by part of private and public keys
const Encrypt = function (cleardata) {
  let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let crypted = cipher.update(cleardata, 'utf8', 'binary') + cipher.final('binary');
  return new Buffer(crypted, 'binary').toString('base64');
}

// Decrypted to AES 256 by part of private and public keys
const Decrypt = function (cleardata) {
  crypted = new Buffer(cleardata, 'base64').toString('binary');
  let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return decipher.update(crypted, 'binary', 'utf8') + decipher.final('utf8');
}

/**
 * export mdoules
 */
module.exports = {
  Encrypt,
  Decrypt,
};
