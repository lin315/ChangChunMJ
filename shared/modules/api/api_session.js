/**
 * Created by leo on 12/3/2017.
 */

var APISession = function(app) {
    this.params = {};
    this.locks = [];
    this.Lock = app.module_manager.getModule(CONST.MODULE.LOCK);

    /**
     * 新增参数组
     *
     * @param {Array} params: 参数组
     */
    this.addParams = function (params) {
        UTIL.copyAttributes(this.params, params);
    };

    /**
     * 设置Session键值
     *
     * @param {string} key: 键
     * @param {*} value: 值
     */
    this.set = function(key, value) {
        this.params[key] = value;
    };

    /**
     * 获取参数
     *
     * @param {string} key: 键值
     * @return {*}
     */
    this.get = function (key) {
        return this.params[key];
    };

    /**
     * 对item进行加锁
     *
     * @param {string} item: 加锁键值
     * @param {function} callback: 回调
     */
    this.lock = function (item, callback) {
        var exists = false;
        for (var i = 0; i < this.locks.length; i++) {
            var lock = this.locks[i];
            if (lock.isKey(item)) {
                exists = true;
                break;
            }
        }

        //  如果没对item加过锁，进行加锁
        if (!exists) {
            var self = this;
            this.Lock.lock(item, function (err, lock) {
                if (err)
                    return callback(err);

                self.locks.push(lock);
                callback(null, lock);
            });
        }
        else
            callback(null);
    };

    /**
     * 解锁所有Lock
     */
    this.unlockAll = function () {
        for (var i = 0; i < this.locks.length; i++) {
            var lock = this.locks[i];
            this.Lock.unlock(lock);
        }
    };
};

module.exports = APISession;