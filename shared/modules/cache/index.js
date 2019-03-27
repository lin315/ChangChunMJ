var redis = require('redis');

var CacheModule = function() {
    this.client = null;
    this.app = null;
    this.config = null;

    /**
     * 删除缓存的值
     * @param {String} key  建
     * @param {Function} [callback] (Object) 回调
     */
    this.del = function(key, callback) {
        callback = callback || function () {};

        this.client.send_command('del', [key], callback);
    };

    /**
     * 设置缓存的值
     * @param {String} key  建
     * @param {Object} value  值对象
     * @param {number} [expires] 过期时间秒, 可以忽略
     * @param {Function} [callback] 回调
     */
    this.set = function(key, value, expires, callback) {
        if (expires instanceof Function) {
            callback = expires;
            expires = 0;
        }
        callback = callback || function () {};

        var onRedisSet = function (err, res) {
            if (err) {
                callback(err);
            } else {
                callback(null, res);
            }
        };

        //  序列花后保存
        var new_value = JSON.stringify(value);
        if (!expires)
            this.client.set(key, new_value, onRedisSet);
        else
            this.client.send_command('setex', [key, expires, new_value], onRedisSet);
    };

    /**
     * 读取缓存的值
     * @param {String} key  建
     * @param {Function} callback (err, Object) 回调
     */
    this.get = function (key, callback) {
        this.client.get(key, function (err, data) {
            if (err)
                return callback(err);

            //  获取后进行反序列化
            var res;
            try {
                res = JSON.parse(data);
            }
            catch (e) {
                return callback(new Error('error reading from cache: key=' + key + ' content=' + data));
            }

            callback(null, res);
        });
    };

    /**
     * 加锁
     * @param {String} key 锁名称
     * @param {number} value 锁值
     * @param {number} expires 锁过期时间
     * @param {Function} [callback] 回调
     */
    this.tryLock = function (key, value, expires, callback) {
        //  加锁
        this.client.send_command('set', [key, value, 'nx', 'ex', expires], function (err, data) {
            if (!err && data === 'OK') {
                callback(null, true);
            }
            else if (!err) {
                callback(null, false);
            }
            else {
                callback(err);
            }
        });
    };

    /**
     * 解锁
     * @param {String} key 锁名称
     * @param {String} value 锁值
     * @param {Function} callback  回调
     */
    this.unlock = function (key, value, callback) {
        var self = this;
        this.client.get(key, function (err, data) {
            if (err) {
                callback(err);
                return;
            }

            //  只有是我加的锁才会解锁
            if (data == value) {
                self.client.del(key, function (err) {
                    if (!err) {
                        callback(null);
                    } else {
                        callback(err)
                    }
                });
            }
            else {
                callback(null);
            }
        });
    };

    /**
     * 增加1
     * @param {String} key 键
     * @param {Function} [callback]
     */
    this.increase = function (key, callback) {
        callback = callback || function () {};

        //  加1
        this.client.send_command('incr', [key], callback);
    };

    /**
     * 增加1
     * @param {String} key 键
     * @param {int} amount 增加数量
     * @param {Function} [callback]
     */
    this.increaseBy = function (key, amount, callback) {
        callback = callback || function () {};

        //  加amount
        this.client.send_command('incrby', [key, amount], callback);
    };

    /**
     * 减少1
     * @param {String} key 键
     * @param {Function} [callback]
     */
    this.decrease = function (key, callback) {
        callback = callback || function () {};

        //  加1
        this.client.send_command('decr', [key], callback);
    };

    /**
     * 根据编号获取model
     * @param {String} model 模型名称/表格名称
     * @param {String} id  编号
     * @param {Function} callback (err, Object) 回调
     */
    this.getByID = function (model, id, callback) {
        var key = 'db:' + model + ':' + id;
        this.client.get(key, function (err, data) {
            if (err)
                return callback(err);

            var res;
            try {
                res = JSON.parse(data);
            }
            catch (e) {
                return callback(new Error('error reading from cache: key=' + key));
            }

            callback(null, res);
        });
    };

    /**
     * 从缓存删除model
     * @param {string} model 模型名称/表格名称
     * @param {string} id 模型id
     * @param {function} callback 回调
     */
    this.deleteModel = function (model, id, callback) {
        callback = callback || function () {};

        var key = 'db:' + model + ':' + id;
        this.del(key, callback);
    };


    /**
     * 根据编号缓存model
     * @param {String} model  模型名称/表格名称
     * @param {Object} val  模型数据
     * @param {Function} callback (err, Object) 回调
     */
    this.saveModel = function (model, val, callback) {
        callback = callback || function () {};

        if (!val || val.id === undefined || val.id === null)
            return callback(new Error('save model: model data is not valid'));

        //  保存，过期时间为3天
        var key = 'db:' + model + ':' + val.id;
        this.set(key, val, 60 * 60 * 24 * 3, function (err) {
            if (err)
                return callback(err);

            callback(null, val);
        });
    };

    /**
     * 清除缓存中的模型数据
     * @param {String} model 模型名称
     * @param {Function} [callback] 回调
     */
    this.clearModels = function (model, callback) {
        callback = callback || function () {};

        var key_pattern = 'db:' + model + ':*';
        var self = this;
        this.client.send_command('keys', [key_pattern], function (err, key_list) {
            if (err)
                return callback(err);

            if (!key_list)
                return callback(null);

            var del_count = 0;
            for (var i = 0; i < key_list.length; i++) {
                self.del(key_list[i], function () {
                    del_count++;
                    if (del_count == key_list.length)
                        callback(null);
                });
            }
        });
    };

    /**
     * 添加到集合当中
     * @param {String} set 集合名称
     * @param {String} item item
     * @param {Function} [callback]
     */
    this.addToSet = function (set, item, callback) {
        callback = callback || function () {};

        var set_key = 'set:' + set;
        this.client.send_command('sadd', [set_key, item], callback);
    };

    /**
     * 获取集合中元素数
     * @param {String} set 集合名称
     * @param {Function} callback
     */
    this.getSetItemCount = function (set, callback) {
        var set_key = 'set:' + set;
        this.client.send_command('scard', [set_key], callback);
    };

    /**
     * 删除集合
     * @param {String} set 集合名称
     */
    this.clearSet = function (set) {
        var set_key = 'set:' + set;
        this.del(set_key);
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

        if (config.type != 'redis')
            return callback(new Error('Cache Type is not supported!'));

        this.client = redis.createClient(config.redis.PORT, config.redis.HOST, {});
        this.client.on("error", function (err) {
            console.log("Redis Error " + err);
        });
        this.client.select(config.redis.DB);

        callback(null);
    };
};

module.exports = new CacheModule();