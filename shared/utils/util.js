var crypto = require('crypto');
var forbidden_words = require('../config/forbidden');

String.prototype.format = function(args) {
    if (arguments.length > 0) {
        var result = this;
        if (arguments.length == 1 && typeof (args) == "object") {
            for (var key in args) {
                var reg = new RegExp ("({" + key + "})","g");
                result = result.replace(reg, args[key]);
            }
        }
        else {
            for (var i = 0; i < arguments.length; i++) {
                if(arguments[i] == undefined) {
                    return "";
                }
                else {
                    var reg = new RegExp ("({[" + i + "]})","g");
                    result = result.replace(reg, arguments[i]);
                }
            }
        }
        return result;
    }
    else {
        return this;
    }
};

/**
 * 屏蔽聊天中不合法的内容
 *
 * @param {string} content 原内容
 * @return {string} 返回被屏蔽后的内容
 */
exports.filter_words = function (content) {
    //  读取屏蔽库
    for (var i = 0; i < forbidden_words.length; i++) {
        content = content.replace(new RegExp(forbidden_words[i],'gm'),'***');
    }

    return content;
};

/**
 * 获取min与max之间的随机数
 *
 * @param {number} min 最小值
 * @param {number} max 最大值（不包含）
 * @return {number} 随机数
 */
exports.randomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
};

/**
 * 获取随机字符串
 *
 * @param {int} length 字符串长度
 * @return {string} 随机字符串
 */
exports.randomString = function(length) {
    var alphabets = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    var result = "";
    var alphabets_len = alphabets.length;
    for (var i = 0; i < length; i++) {
        var pos = exports.randomInt(0, alphabets_len);
        result = result + alphabets.charAt(pos);
    }

    return result;
};

/**
 * 获取随机数字字符串
 *
 * @param {int} length 字符串长度
 * @return {string} 随机字符串
 */
exports.randomNumber = function(length) {
    var result = "";
    for (var i = 0; i < length; i++) {
        result = result + exports.randomInt((i == 0 ? 1 : 0), 10);
    }

    return result;
};

/**
 * 打乱数组的顺序
 *
 * @param {Array} data
 * @return {Array}
 */
exports.shuffle = function (data) {
    //  进行洗牌
    for(var i = 0; i < data.length; ++i){
        var last_index = data.length - 1 - i;
        index = exports.randomInt(0, last_index);
        var temp = data[index];
        data[index] = data[last_index];
        data[last_index] = temp;
    }

    return data;
};

/**
 * 获取成功消息对象
 * @param {object} result 响应结果
 * @return {object} 成功响应对象
 */
exports.successResult = function(result) {
    return {
        code : 0,
        data : result
    };
};

/**
 * 发送成功消息
 * @param {object} res 响应对象
 * @param {object} result  响应结果
 */
exports.success = function(res, result) {
    res.send(JSON.stringify(exports.successResult(result)));
};

/**
 * 获取失败消息对象
 * @param {int} error_code 错误码
 * @param {string} msg 错误信息
 * @return {object} 错误对象
 */
exports.failResult = function(error_code) {
    var Lang = module_manager.getModule(CONST.MODULE.LANG);
    var msg_str = Lang.T(error_code);

    return {
        code : -1,
        error_code : error_code,
        message : msg_str
    };
};

/**
 * 发送失败消息
 * @param {object} res 响应对象
 * @param {int} error_code 错误码
 */
exports.fail = function(res, error_code) {
    res.send(JSON.stringify(exports.failResult(error_code)));
};

/**
 * 日期-时间格式化
 * @param {number} [time] 时间戳（可以不传)
 * @return {string} Y-m-d H:i:s格式的时间
 */
exports.getTimeDesc = function (time) {
    var date;
    if (time)
        date = new Date(time);
    else
        date = new Date();

    var datetime = "{0}-{1}-{2} {3}:{4}:{5}";
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = month >= 10 ? month : ("0" + month);
    var day = date.getDate();
    day = day >= 10 ? day : ("0" + day);
    var h = date.getHours();
    h = h >= 10 ? h : ("0" + h);
    var m = date.getMinutes();
    m = m >= 10 ? m : ("0" + m);
    var s = date.getSeconds();
    s = s >= 10 ? s : ("0" + s);
    datetime = datetime.format(year, month, day, h, m, s);
    return datetime;
};

/**
 * 获取几天后的格式化的日期
 *
 * @param {number} days 日数
 * @param {string} [format] 格式（可以不传)
 * @return {string} format格式的时间
 */
exports.getDateAfterDays = function (days, format) {
    var date = new Date();

    return exports.getGivenDateAfterDays(date, days, format);
};

/**
 * 获取几天后的格式化的日期
 *
 * @param {Date} date 日期
 * @param {number} days 日数
 * @param {string} [format] 格式（可以不传)
 * @return {string} format格式的时间
 */
exports.getGivenDateAfterDays = function (date, days, format) {
    var datetime;
    if (format)
        datetime = format;
    else
        datetime = "{0}-{1}-{2}";
    date.setDate(date.getDate() + days);

    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = month >= 10 ? month : ("0" + month);
    var day = date.getDate();
    day = day >= 10 ? day : ("0" + day);

    datetime = datetime.format(year, month, day);
    return datetime;
};

/**
 * 左边补零
 *
 * @param {string} str
 * @param {string} len
 * @param {string} [pad_char] 默认'0'
 */
exports.padLeft = function (str, len, pad_char) {
    str = str + '';
    var absent_len = len - str.length;
    if (absent_len <= 0)
        return str.substr(0, len);

    if (pad_char == undefined)
        pad_char = '0';

    var result = str;
    for (var i = 0; i < absent_len; i++)
        result = pad_char + result;

    return result;
};

/**
 * 日期格式化
 *
 * @param {string} [format] 格式（可以不传)
 * @param {number} [time] 时间戳（可以不传)
 * @return {string} Y-m-d格式的时间
 */
exports.getDateDesc = function (format, time) {
    var date;
    if (time)
        date = new Date(time);
    else
        date = new Date();

    var datetime;
    if (format)
        datetime = format;
    else
        datetime = "{0}-{1}-{2}";
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = month >= 10 ? month : ("0" + month);
    var day = date.getDate();
    day = day >= 10 ? day : ("0" + day);

    datetime = datetime.format(year, month, day);
    return datetime;
};

/**
 * 判断某对象是否为数组
 *
 * @param {object} object
 * @return {boolean}
 */
exports.isArray = function(object){
    return Object.prototype.toString.call(object)=='[object Array]';
};

/**
 * 判断第一个数组是否包含第二个数组
 *
 * @param array1
 * @param array2
 */
exports.containsArray = function(array1, array2) {
    for (var i = 0; i < array1.length; i++) {
        var element_array = array1[i];

        if (exports.isSameArray(element_array, array2)) {
            return true;
        }
    }

    return false;
};

/**
 * 获取指定元素的个数
 *
 * @param array
 * @param element
 * @returns {number}
 */
exports.elementCount = function(array, element) {
    var count = 0;

    for (var i = 0; i < array.length; i++) {
        if (array[i] === element) {
            count ++;
        }
    }

    return count;
};

/**
 * 扁平化数字数组
 *
 * @param array
 * @returns {any[]}
 */
exports.flattenNumberArray = function(array) {
    return array.toString().split(',').map(function(item){
        return +item;
    });
};

/**
 * 获取数组的最大元素
 *
 * @param array
 * @returns {*}
 */
exports.maxElement = function(array) {
    var value = array[0];
    for (var i = 1; i < array.length; i++) {
        if (array[i] > value) {
            value = array[i];
        }
    }

    return value;
};

/**
 * 获取数组的最大元素
 *
 * @param array
 * @returns {*}
 */
exports.minElement = function(array) {
    var value = array[0];
    for (var i = 1; i < array.length; i++) {
        if (array[i] < value) {
            value = array[i];
        }
    }

    return value;
};

/**
 * 浅拷贝目标对象
 *
 * @param {Object} target 目标对象
 * @return {Object} 结果对象
 */
exports.simple_clone = function(target) {
    if (target === null)
        return null;

    var result = {};
    if (typeof target == 'object') {
        if (exports.isArray(target))
            result = [];
    }
    else {
        return target;
    }

    for (var key in target) {
        if (target.hasOwnProperty(key)) {
            result[key] = target[key];
        }
    }

    return result;
};

/**
 * 深拷贝目标对象
 *
 * @param {Object} target 目标对象
 * @return {Object} 结果对象
 */
exports.deep_clone = function (target) {
    if (target === null) {
        return null;
    }

    var result = {};
    if (typeof target == 'object') {
        if (exports.isArray(target))
            result = [];
    }
    else {
        return target;
    }

    for (var key in target) {
        if (target.hasOwnProperty(key)) {
            var value = target[key];

            //if (typeof value == 'object')
            result[key] = exports.deep_clone(value);
            //else
            //result[key] = value;
        }
    }

    return result;
};

/**
 * 判断两个对象是否有相同的属性
 *
 * @param object1
 * @param object2
 */
exports.hasSameProperties = function(object1, object2) {
    for (var key in object1) {
        if (! object2.hasOwnProperty(key)) {
            return false;
        }
    }
    for (var key in object2) {
        if (! object1.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
};

/**
 * 两个数组是否相等
 *
 * @param array1
 * @param array2
 * @returns {boolean}
 */
exports.isSameArray = function(array1, array2) {
    if (array1.length !== array2.length) {
        return false;
    }

    var i;

    for (i = 0; i < array1.length; i++) {
        if (array2.indexOf(array1[i]) === -1) {
            return false;
        }
    }

    for (i = 0; i < array2.length; i++) {
        if (array1.indexOf(array2[i]) === -1) {
            return false;
        }
    }

    return true;
};

/**
 * 生成Token
 *
 * @param data
 * @returns {string}
 */
exports.generateToken = function(data) {
    return Date.now().toString() + data + exports.randomString(16);
};

/**
 * 将source对象的所有属性值拷贝到target对象
 *
 * @param {object} target 目标对象
 * @param {object} source 源对象
 */
exports.copyAttributes = function(target, source) {
    if (!source || !target)
        return;

    for (var key in source) {
        if (source.hasOwnProperty(key))
            target[key] = source[key];
    }
};

/**
 * 加密字符串
 * @param {string} content 目标字符串
 * @return {string} 返回结果
 */
exports.encrypt = function(content) {
    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
};

/**
 * 是否有效手机号
 *
 * @param phone: 手机号
 * @returns {boolean}
 */
exports.isValidPhone = function(phone) {
    if(!(/^1[34578]\d{9}$/.test(phone))){
        return false;
    }

    return true;
};

///////////////////////////////////////////////////////////////////////////////
//
//  支付相关
//
//  generateNonceStr:               生成随机字符串
//  generateTimeStamp:              生成时间戳
//
///////////////////////////////////////////////////////////////////////////////

/**
 * 生成随机字符串
 *
 */
exports.generateNonceStr = function() {
    return Math.random().toString(36).substr(2, 15);
};

/**
 * 生成时间戳
 *
 * @returns {string}
 */
exports.generateTimeStamp = function() {
    return parseInt(new Date().getTime() / 1000) + '';
};

exports.max = function(a, b) {
    return (a > b) ? a : b;
};

exports.min = function(a, b) {
    return (a < b) ? a : b;
};

