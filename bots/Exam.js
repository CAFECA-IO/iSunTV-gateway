const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const dvalue = require('dvalue');

var logger;

var formatQuestion = function (data) {

};
var formatExam = function (data) {
//_id, email, questions, current, finish, result
	var rs = {
		email: data.email,
		questions: data.questions,
		current: data.current || 0,
		finish: !!data.finish,
		result: !!data.result
	};
	return rs;
};
var descQuestion = function (data) {
	var rs = dvalue.clone(data);
	rs.exid = data._id.toString();
	dvalue.shuffle(rs.selection);
	delete rs._id;
	return rs;
};

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
	this.initQuestions();
};

Bot.prototype.initQuestions = function () {
	var questions = this.db.collection('Questions');
	questions.count({}, function (e, d) {
		if(d == 0) {
			var q = [];
			q.push({
				question: '一代槍王卡拉什尼科夫將軍發明的自動步槍改變了蘇聯戰爭史，請問他所發明的自動步槍型號為下列哪項？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['AK-47', 'M-16', 'Mle-1918']
			});
			q.push({
				question: '為紀念中國著名作曲家冼星海而建立的“冼星海大街”和 “冼星海紀念碑”位於哈薩克斯坦的哪座城市？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['阿拉木圖市', '奥什市', '阿斯塔納市']
			});
			q.push({
				question: '微軟創辦人比爾蓋茨多年來大力支持慈善事業，請問他到訪中國商討慈善合作是在哪一年？',
				info: '答案可於iSunTV獨家節目《北美掠影》內獲得',
				selection: ['2010年', '2003年', '1999年']
			});
			q.push({
				question: '有“巴基斯坦的心靈“之稱的古城拉合爾曾是哪一個王朝的首都？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['莫臥爾王朝', '薩法爾王朝', '圖格魯克王朝']
			});
			q.push({
				question: '下列哪一個國家在阿拉伯語有“幸福沙漠”的意思並且是伊斯蘭最豐富的石油儲藏地？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['沙烏地阿拉伯', '葉門', '蘇丹']
			});
			q.push({
				question: '中國功夫的傳奇人物霍元甲出生在天津的小南河村，他小時候曾在什麼地方打工維持生計？',
				info: '答案可於iSunTV獨家節目《中華人文地理》內獲得',
				selection: ['藥房', '茶樓', '客棧']
			});
			q.push({
				question: '第一次世紀大戰戰場之一的約旦瓦迪拉姆沙漠，因為荒涼寧靜而獲得了一個什麼樣的別稱？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['月亮穀', '中東森林', '黑沙漠']
			});
			q.push({
				question: '俄羅斯太平洋艦隊司令部所在的海參崴港口於哪一年落成？',
				info: '答案可於iSunTV獨家節目《陽光天才行－睦鄰》內獲得',
				selection: ['1860年', '1855年', '1850年']
			});
			q.push({
				question: '世界上最深最古老的湖－貝加爾湖的歷史有多少年？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['2000萬年以上', '1500萬年以上', '500萬年以上']
			});
			q.push({
				question: '以下哪一座皇宮不位於俄羅斯聖彼得堡？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['克里姆林宫', '葉卡捷琳娜宮', '彼得宮']
			});
			q.push({
				question: '哪一個「古代絲綢之路」所經過的中東國家曾得到「山巔美玉」的美稱？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['阿富汗', '科威特', '埃及']
			});
			q.push({
				question: '“男人穿裙子，女人剃光頭”是哪個國家獨有的奇觀？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['緬甸', '印度', '汶萊']
			});
			q.push({
				question: '美國哪一個城市的中央車站是全球最大的車站？',
				info: '答案可於iSunTV獨家節目《北美掠影》內獲得',
				selection: ['紐約', '洛杉磯', '布蘭克林']
			});
			q.push({
				question: '美國聯邦調查局FBI無數次出現在《x檔案》，《沈默的羔羊》等美國大片中，這個現今擁有3萬5千名菁英的機構當初是由幾位偵探組成？',
				info: '答案可於iSunTV獨家節目《北美掠影》內獲得',
				selection: ['34位', '40', '56位']
			});
			q.push({
				question: '下列哪一項在印度是被視為神聖象徵的母親河？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['恆河', '印度河', '狮泉河']
			});
			q.push({
				question: '下列哪一項是當代著名文學家畢淑敏的成名之作？',
				info: '答案可於iSunTV獨家節目《口述歷史－往事歲月》內獲得',
				selection: ['《昆侖殤》', '《紅處方》', '《女人之約》']
			});
			q.push({
				question: '下列哪一位是中國大陸第一變性人？',
				info: '答案可於iSunTV獨家節目《人物類－百年婚戀》內獲得',
				selection: ['張克莎', '馬天如', '妃嬙']
			});
			q.push({
				question: '下列哪一位是被毛澤東稱為“我那盞不滅的燈”的晚年私人管家？',
				info: '答案可於iSunTV獨家節目《口述歷史－塵封記憶》內獲得',
				selection: ['吳連登', '毛順生', '林彪']
			});
			q.push({
				question: '下列哪一項是在越南有「國服」美譽的女性衣著？',
				info: '答案可於iSunTV獨家節目《陽光天下行－兄弟》內獲得',
				selection: ['襖帶旗袍', '矮領旗袍', '琵琶襟旗袍']
			});
			q.push({
				question: '下列哪一項是「南海樂園」峇里島的所在位置？',
				info: '答案可於iSunTV獨家節目《陽光天下行－兄弟》內獲得',
				selection: ['小巽他群島', '大巽他群島', '摩鹿加群岛']
			});
			q.push({
				question: '萬人敬仰的超級巨星貓王曾經用特有的音樂打破了當時社會的哪種隔閡？',
				info: '答案可於iSunTV獨家節目《北美掠影》內獲得',
				selection: ['性別', '階層', '種族']
			});
			q.push({
				question: '美國於哪一個事件後改變了國際策略並開展全球戰略佈局？',
				info: '答案可於iSunTV獨家節目《北美掠影》內獲得',
				selection: ['珍珠港', '獨立戰爭', '古巴導彈危機']
			});
			q.push({
				question: '在拉丁傳統的女性成年禮上，女性會與父親共舞一曲並獲得一個什麼樣的禮物？',
				info: '答案可於iSunTV獨家節目《北美掠影》內獲得',
				selection: ['洋娃娃', '鞋子', '蝴蝶結']
			});
			q.push({
				question: '美國政府當年從誰手中買下了一片土地並建立了溫泉國家公園？',
				info: '答案可於iSunTV獨家節目《北美掠影》內獲得',
				selection: ['印地安人', '馬雅人', '印加人']
			});
			q.push({
				question: '第五代導演最具有代表性的作品《紅高粱》的原聲音樂創作者是？',
				info: '答案可於iSunTV獨家節目《口述歷史－往事歲月》內獲得',
				selection: ['趙季平', '張藝謀', '韓三平']
			});
			q.push({
				question: '“中國搖滾第一女聲“羅琦於18歲失去左眼並在22歲時做了什麼讓自己後悔的事情？',
				info: '答案可於iSunTV獨家節目《口述歷史－往事歲月》內獲得',
				selection: ['吸毒', '偷竊', '輟學']
			});
			q.push({
				question: '抗日戰爭期間，為了鼓舞軍民的抗敵熱情，於哪一年創辦了新聞期刊《晉察冀畫報》？',
				info: '答案可於iSunTV獨家節目《口述歷史－記者舊記》內獲得',
				selection: ['1942年', '1945年', '1938年']
			});
			q.push({
				question: '在香港這個寸土寸金的地方，在全球房地產價格排名中一直位居前列。何人在70年前於香港成立港九地產公司開展地產生意？',
				info: '答案可於iSunTV獨家節目《口述歷史－我的家人》內獲得',
				selection: ['章乃器', '孔祥熙', '宋子文']
			});
			q.push({
				question: '哪個歷史城市曾是埃及帝國的中心之地？',
				info: '答案可於iSunTV獨家節目《陽光天下行－兄弟》內獲得',
				selection: ['尼克索', '衣索比亞', '阿斯旺']
			});
			q.push({
				question: '北非國家突尼斯因其殊異的沙漠風光成為了哪一步著名電影的拍攝地？',
				info: '答案可於iSunTV獨家節目《陽光天下行－兄弟》內獲得',
				selection: ['《星球大戰》', '《2001太空漫遊》', '異形》']
			});
			q.push({
				question: '摩洛哥哪一個城市是由科技林立的新城和古蹟遍地的舊城兩部分組成？',
				info: '答案可於iSunTV獨家節目《陽光天下行－兄弟》內獲得',
				selection: ['拉巴特', '菲斯', '米克尼斯']
			});
			q.push({
				question: '哪一個國家的律師曾多次幫助中國航空公司打贏官司並引起了世界的關注？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['俄羅斯', '南韓', '美國']
			});
			q.push({
				question: '國家圖書館鎮館之寶“殷墟甲骨文”是在哪一年被發現？',
				info: '答案可於iSunTV獨家節目《國寶背後的故事》內獲得',
				selection: ['1899年', '1905年', '1913年']
			});
			q.push({
				question: '秦王贏政熱衷出遊，馬車隊伍極其浩大，其中兩輛標誌性的銅車馬於什麼年份被發現？',
				info: '答案可於iSunTV獨家節目《國寶背後的故事》內獲得',
				selection: ['1978年', '1991年', '1988年']
			});
			q.push({
				question: '印度南部哪一個城市同時享有“印度硅谷”和“花園城市”的盛名？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['班加羅爾', '哥印拜陀', '金奈']
			});
			q.push({
				question: '東南亞最大的淡水湖洞里薩湖鄰近哪一座東南亞古都？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['吳哥', '龍坡邦', '朗勃拉邦']
			});
			q.push({
				question: '哪一個東南亞移民國家是由華人、馬來人、印度人組成？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['新加坡', '汶萊', '馬來西亞']
			});
			q.push({
				question: '日本第六大城市神戶曾於哪一年受到大地震襲擊險遭毀滅？',
				info: '答案可於iSunTV獨家節目《陽光天下行－睦鄰》內獲得',
				selection: ['1995年', '1989年', '1993年']
			});
			questions.insertMany(q, {}, function () {});
		}
	});
}

/*
_id, email, questions, current, finish, result, invitation
 */

// require: email, name
Bot.prototype.getExamination = function (options, cb) {
	var self = this;
	var examinations = this.db.collection('Examinations');
	var condition = {email: options.email};
	examinations.findOne(condition, {}, function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else if(d1) {
			if(!d1.finish) {
				var q = d1.questions[d1.current];
				dvalue.shuffle(q.selection);
				q._id = d1._id;
				return cb(null, descQuestion(q));
			}
			else if(d1.result) {
				e1 = new Error('already get invite code');
				e1.code = '04901';
				return cb(e1);
			}
			else {
				e1 = new Error('examination failed');
				e1.code = '04801';
				return cb(e1);
			}
		}
		else {
			self.generateExamination(options, function (e2, d2) {
				if(e2) { return cb(e2); }
				else {
					var q = d2.questions[d2.current];
					dvalue.shuffle(q.selection);
					q._id = d2._id;
					return cb(null, descQuestion(q));
				}
			});
		}
	});
};

/**
* @class Exam
* <h1>[API 602] create examination</h1>
*
*<b>POST</b> https://api.isuntv.com/<mark>examination</mark>
*
* Header: 
*
*     @example 
*     Content-Type: application/json
*
*
* Raw-body:
*
* @param {Object} options An raw-body describing email and username:
* @param {String} options.email The email address.
* @param {String} options.username The username.
*
*     @example 
*     {
*       "email": "kkbox@gmail.com",
*       "username": "Travis Lo"
*     }
*
* @return {Object} Object with properties:
* @return {Number} return.result Return 1 on successful, otherwise 0.
* @return {String} return.message The error message.
* @return {Object} return.data Empty data.
* @return {Long} return.cost The API running time.
*
*     @example 
*     {
*       "result": 1,
*       "message": "Get examination",
*       "data": {},
*       "cost": 209
*     }
*/
Bot.prototype.generateExamination = function (options, cb) {
	var questions = this.db.collection('Questions');
	var examinations = this.db.collection('Examinations');
	questions.find({}, {_id: 0}).toArray(function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else {
			var q = formatExam({
				email: options.email,
				questions: JSON.parse(JSON.stringify(dvalue.randomPick(d1, 3)))
			});
			examinations.insertOne(q, function (e2, d2) {
				if(e2) {
					e2.code = '01001';
					cb(e2);
				}
				else {
					cb(null, q);
				}
			});
		}
	});
};
//api 603
Bot.prototype.getQuestion = function (options, cb) {
	var examinations = this.db.collection('Examinations');
	var condition = {_id: new mongodb.ObjectID(options.exid)};
	examinations.findOne(condition, {}, function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else if(!d1) {
			e1 = new Error('examination not found');
			e1.code = '04301';
			return cb(e1);
		}
		else if(d1.finish) {
			if(d1.result) {
				e1 = new Error('already get invite code');
				e1.code = '04901';
				return cb(e1);
			}
			else {
				e1 = new Error('examination failed');
				e1.code = '04801';
				return cb(e1);
			}
		}
		else {
			var rs, q = d1.questions[d1.current];
			q._id = d1._id;
			rs = {
				finish: false,
				question: descQuestion(q)
			};
			return cb(null, rs);
		}
	});
};
//api 604
// require: exid, answer
Bot.prototype.submitAnswer = function (options, cb) {
	var examinations = this.db.collection('Examinations');
	var condition = {_id: new mongodb.ObjectID(options.exid)};
	examinations.findOne(condition, {}, function (e1, d1) {
		if(e1) { e1.code = '01002'; return cb(e1); }
		else if(!d1) {
			e1 = new Error('examination not found');
			e1.code = '04301';
			return cb(e1);
		}
		else if(d1.finish) {
			if(d1.result) {
				e1 = new Error('already get invite code');
				e1.code = '04901';
				return cb(e1);
			}
			else {
				e1 = new Error('examination failed');
				e1.code = '04801';
				return cb(e1);
			}
		}
		else {
			if(d1.questions[d1.current].selection[0] == options.answer) {
			// correct
				if(++d1.current < d1.questions.length) {
				// next question
					var rs, updateQuery, q = d1.questions[d1.current];
					q._id = d1._id;
					rs = {
						finish: false,
						question: descQuestion(q)
					};
					updateQuery = {$set: {
						current: d1.current
					}};
					examinations.findAndModify(condition, {}, updateQuery, {}, function (e2, d2) {
						if(e2) {
							e2.code = '01003';
							return cb(e2);
						}
						else {
							return cb(null, rs);
						}
					});
				}
				else {
				// finish
					var updateQuery, rs;
					rs = {
						finish: true,
						question: undefined,
						invitation: dvalue.randomID(8)
					};
					updateQuery = {$set: {
						finish: true,
						result: true,
						invitation: rs.invitation
					}};
					examinations.findAndModify(condition, {}, updateQuery, {}, function (e2, d2) {
						if(e2) {
							e2.code = '01003';
							return cb(e2);
						}
						else {
							return cb(null, rs);
						}
					});
				}
			}
			else {
			// error
				e1 = new Error('examination failed');
				e1.code = '04801';
				updateQuery = {$set: {
					finish: true,
					result: false
				}};
				examinations.findAndModify(condition, {}, updateQuery, {}, function (e2, d2) {
					if(e2) {
						e2.code = '01003';
						return cb(e2);
					}
					else {
						return cb(e1);
					}
				});
			}
		}
	});
};

module.exports = Bot;