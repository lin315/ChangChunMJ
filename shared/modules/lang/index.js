/**
 * 国际化语言模块
 */
function LanguageModule() {
    this.app = null;
    this.config = null;
    this.lang = null;

    /**
     * 获取代码对应的字符串，并进行格式化
     *
     * @param {int} code 消息代码
     * @return {String} 字符串
     */
    this.T = function (code) {
        var msg_str = this.lang[code] || code;
        if (!msg_str)
            return '';

        var args = [];
        for (var i = 1; i < arguments.length; i++)
            args.push(arguments[i]);

        //return String.prototype.format.apply(msg_str, args);
        return msg_str.format(args);
    };

    /**
     *
     * 初始化
     * @param {Object} app 应用
     * @param {Object} config 设置
     * @param {Function} [callback] 回调
     */
    this.init = function (app, config, callback) {
        callback = callback || function () {};

        this.app = app;
        this.config = config;

        //  加载语言模块
        var lang = (config.lang || 'zh');
        this.lang = require('./data/' + lang);

        callback(null);
    };
}

module.exports = new LanguageModule();