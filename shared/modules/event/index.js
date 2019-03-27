/**
 * Created by Achilles on 2017/4/23.
 */
var redis = require('redis');

/**
 * 基于Redis的消息发布/订阅机制
 * 可在多个分布式服务器之间实现消息传递
 * @constructor
 */
var EventModule = function() {
    var CHANNEL_NAME = 'event';

    this.app = null;
    this.publisher = null;
    this.subscriber = null;
    this.entries = {};

    /**
     * 注册事件监听器
     * @param {String} event 事件名称
     * @param {Function} callback 回调
     */
    this.on = function (event, callback) {
        var entry = this.entries[event];
        if (!entry) {
            entry = {};
            entry.event = event;
            entry.handlers = [callback];
            this.entries[event] = entry;
        }
        else {
            var handlers = entry.handlers;
            for (var i = 0; i < handlers.length; i++) {
                if (handlers[i] == callback)
                    return;
            }

            handlers.push(callback);
        }
    };

    /**
     * 消息到达
     * @param {String} channel 消息频道
     * @param {String} message 消息内容
     */
    this.onMessage = function (channel, message) {
        if (channel != CHANNEL_NAME)
            return;

        //  进行反序列化
        var msg = null;
        try {
            msg = JSON.parse(message);
        }
        catch (e) {
            return;
        }

        this.fire(msg.event, msg.params);
    };

    /**
     * 注销事件监听器
     * @param {String} event 事件名称
     * @param {Function} [callback] 回调, 如果不指定移除全部
     */
    this.off = function (event, callback) {
        var entry = this.entries[event];
        if (entry) {
            if (!callback)
            {
                this.entries[event] = null;
                return;
            }

            var handlers = entry.handlers;
            for (var i = 0; i < handlers.length; i++) {
                if (handlers[i] == callback) {
                    handlers.splice(i, 1);
                    return;
                }
            }
        }
    };

    /**
     * 发出消息，将消息通过EventSystem发布出去，让远程客户端监听
     * @param {String} event 事件名称
     * @param {Object} params 消息内容
     */
    this.emit = function (event, params) {
        var msg = {
            event: event,
            params: params
        };
        this.publisher.publish(CHANNEL_NAME, JSON.stringify(msg));
    };

    /**
     * 直接执行消息
     * @param {String} event 事件名称
     * @param {Object} params 消息内容
     */
    this.fire = function (event, params) {
        var entry = this.entries[event];
        if (!entry)
            return;

        //  执行处理器
        var handlers = entry.handlers;
        for (var i = 0; i < handlers.length; i++) {
            try{
                handlers[i](params);
            }
            catch (e) {}
        }
    };

    /**
     * 初始化
     * @param {Object} app 应用
     * @param {Object} config 设置
     * @param {Function} [callback] 回调
     */
    this.init = function (app, config, callback) {
        callback = callback || function () {};

        this.app = app;
        this.config = config;

        this.subscriber = redis.createClient(config.redis.PORT, config.redis.HOST, {});
        this.subscriber.on("message", this.onMessage.bind(this));
        this.subscriber.subscribe(CHANNEL_NAME);

        this.publisher = redis.createClient(config.redis.PORT, config.redis.HOST, {});

        callback(null);
    };
};

module.exports = new EventModule();