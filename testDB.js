const url = require('url');
const path = require('path');
const dvalue = require('dvalue');
const mongodb = require('mongodb').MongoClient;
const options = {
    type: 'mongodb',
    path: 'mongodb://172.31.11.246:27056/iSunTV',
    user: 'iSunTVDB',
    password: 'WLyVUfhrAjibzD'
};

let ticket1 = {
    type: 3,
    gateway: 'braintree',
    oid: '',
    uid: '5d26f25b7c6d1925925ea55a',
    ppid: '5825ac29f8d6402dbdca9d03',
    programs: [],
    enable: true,
    expire: 2000000000000,
    trial: 0,
    charge: 2000000000000,
    duration: 31536000000,
    subscribe: '',
    ctime: 1545824726385,
    mtime: 1545824726385,
    atime: 1545824726385
};
let ticket2 = {
    type: 3,
    gateway: 'braintree',
    oid: '',
    uid: '5c2c5bdf50a1b520bf565c89',
    ppid: '5825ac29f8d6402dbdca9d03',
    programs: [],
    enable: true,
    expire: 2000000000000,
    trial: 0,
    charge: 2000000000000,
    duration: 31536000000,
    subscribe: '',
    ctime: 1545824726385,
    mtime: 1545824726385,
    atime: 1545824726385
};

var tmpURL = url.parse(options.path);
tmpURL.auth = dvalue.sprintf('%s:%s', options.user, options.password);
dbpath = url.format(tmpURL);
new Promise((resolve, reject) => {
    mongodb.connect(dbpath, (err, db) => {
        resolve(db);
    });
}).then(db => {
    let collection = db.collection('Users');
    let c2 = db.collection('Tickets');
    collection.find({email: {$in: ['chuicl@isuntv.com', 'guowei.sun@tideisun.com']}}).toArray((e, d) => {
        d.map((v) => {
            const uid = v._id.toString();
            ticket1.uid = uid;
            //c2.insert(ticket1);
            console.log(uid);
        })
    });
    //let c2 = db.collection('Tickets');
    //c2.update({uid: '582aafc15cae00512ca7a6a7'}, {$set: {expire: 2000000000000}})
    //c2.insert(ticket1);
    //c2.insert(ticket2);
    c2.find({ uid: {$in: ['5d26f25b7c6d1925925ea55a', '5d26f27d7c6d1925925ea55e']} }).toArray((e, d) => {
        console.log(d);
    });
});
