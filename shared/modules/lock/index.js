/**
 * Created by Administrator on 2017/9/3.
 */

/**
 * 锁对象
 */
function Lock(key, value) {
    this.key = key;
    this.value = value;

    /**
     * 检查键值是否相等
     * @param {String} item
     * @return {boolean}
     */
    this.isKey = function (item) {
        return this.key == Lock.getKey(item);
    };
}

/**
 * 获取item对应的Lock key值
 * @param {String} item
 * @return {string}
 */
Lock.getKey = function (item) {
    return 'lock:' + item;
};

/**
 * 锁模块管理器
 * @constructor
 */
function LockModule() {
    var LOCK_EXPIRES = 3;
    var TRY_SPAN = 10;

    this.app = null;
    this.config = null;

    /**
     * 加锁
     * @param {string} item 锁名称
     * @param {Function} [callback] 回调
     */
    this.lock = function (item, callback) {
        callback = callback || function () {};

        var self = this;
        var key = Lock.getKey(item);
        var val = Math.ceil(Math.random() * 10000000);
        //  加锁
        this.cache.tryLock(key, val, LOCK_EXPIRES, function (err, data) {
            if (!err && data == true) {
                var lock = new Lock(key, val);
                callback(null, lock);
            }
            else if (!err) {
                //  如果未能成功加锁，10毫秒后重试
                console.info('lock(' + item + ') failed, i will retry after ' + TRY_SPAN + 'ms...');
                setTimeout(function () {
                    self.lock(item, callback);
                }, TRY_SPAN);
            }
            else {
                callback(err);
            }
        });
    };

    /**
     * 解锁
     * @param {Lock} item 锁名称
     * @param {Function} [callback] 回调
     */
    this.unlock = function (item, callback) {
        callback = callback || function () {};

        //  解锁
        this.cache.unlock(item.key, item.value, callback);
    };

    /**
     * 获取受到时间限制的key
     * 当获取一次后，过段时间自动释放该锁，在此期间再次获取该锁将会失败
     * @param {string} res_name 名称
     * @param {number} time_limit 时间限制(s)
     * @param {function} callback
     */
    this.get_timed_res = function (res_name, time_limit, callback) {
        callback = callback || function () {};

        //  试图加锁
        var key = 'timeout_lock:' + res_name;
        this.cache.tryLock(key, 1, time_limit, callback);
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

        this.cache = app.module_manager.getModule(CONST.MODULE.CACHE);

        callback(null);
    };
}

module.exports = new LockModule();