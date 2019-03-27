/**
 * Created by leo on 11/24/2017.
 */

var Data = module_manager.getModule(CONST.MODULE.DATA);
var Lock = module_manager.getModule(CONST.MODULE.LOCK);

function Model() {
    this.model = '';
    this.locks = {};
    this.json_fields = [];                  // JSON格式的字段
    this.private_fields = [];               // 不可向外传递的字段
}

/**
 * 将JSON格式的数据项序列化
 *
 * @param {object} data 源数据
 * @return {object} 结果
 */
Model.prototype.serializeData = function (data) {
    if (! data) {
        return data;
    }

    var result = UTIL.simple_clone(data);
    for (var i = 0; i < this.json_fields.length; i++) {
        var field = this.json_fields[i];
        var value = data[field];
        if (value != null && typeof value === 'object') {
            result[field] = JSON.stringify(value);
        }
    }

    return result;
};

/**
 * 将JSON格式的数据项反序列化
 *
 * @param {object} data 源数据
 * @return {object} 结果
 */
Model.prototype.deserializeData = function (data) {
    if (!data)
        return data;

    var result = UTIL.simple_clone(data);
    for (var i = 0; i < this.json_fields.length; i++) {
        var field = this.json_fields[i];
        var value = data[field];
        if (value != null && typeof value === 'string') {
            try {
                result[field] = JSON.parse(value);
            }
            catch (e) {
                result[field] = {};
            }
        }
        else {
            result[field] = {};
        }
    }

    return result;
};

/**
 * 返回可公开的数据
 *
 * @param {Object} data 数据
 * @return {Object}
 */
Model.prototype.getPublicData = function (data) {
    if (!data)
        return {};

    var public_data = UTIL.deep_clone(data);
    for (var i = 0; i < this.private_fields.length; i++) {
        var field = this.private_fields[i];
        if (public_data.hasOwnProperty(field))
            delete public_data[field];
    }

    return public_data;
};

/**
 * 返回可公开的数据
 *
 * @param {Array} datas
 * @return {Array}
 */
Model.prototype.getPublicDatas = function (datas) {
    var result = [];
    for (var i = 0; i < datas.length; i++) {
        var data = datas[i];
        data = this.getPublicData(data);
        result.push(data);
    }

    return result;
};


/**
 * 根据编号获取模型信息
 *
 * @param {String} id 模型信息编号
 * @param {Function} callback 回调
 */
Model.prototype.getByID = function(id, callback){
    var self = this;
    Data.getByID(this.model, id, function (err, data) {
        if (err) {
            return callback(err);
        }

        data = self.deserializeData(data);
        callback(null, data);
    });
};

/**
 * 根据编号获取模型信息, 并加锁
 *
 * @param {String} id 模型信息编号
 * @param {Function} callback 回调
 */
Model.prototype.lockAndGet = function(id, callback){
    //  首先进行加锁
    var self = this;
    this.lock(id, function (err, lock) {
        if (err) {
            return callback(err);
        }

        //  保存锁对象
        self.locks[id] = lock;
        //  获取对象
        self.getByID(id, function (err, data) {
            if (err) {
                self.unlock(id);
                return callback(err);
            }

            callback(null, data);
        });
    });
};

/**
 * 保存模型数据
 *
 * @param {object} data 数据
 * @param {Function} [callback] 回调
 */
Model.prototype.save = function(data, callback){
    callback = callback || function () {};

    data = this.serializeData(data);

    var self = this;
    Data.saveModel(this.model, data, function (err, data) {
        if (err)
            return callback(err);

        data = self.deserializeData(data);
        callback(null, data);
    });
};

/**
 * 创建模型数据
 *
 * @param {object} data 数据
 * @param {Function} [callback] 回调
 */
Model.prototype.create = function (data, callback) {
    callback = callback || function () {};

    data = this.serializeData(data);
    var self = this;
    Data.createModel(this.model, data, function (err, data) {
        if (err)
            return callback(err);

        data = self.deserializeData(data);
        callback(null, data);
    });
};

/*
 * 根据编号删除信息
 *
 * @param {String} id 房间编号
 * @param {Function} [callback] 回调
 */
Model.prototype.delete = function(id, callback){
    callback = callback || function () {};
    Data.deleteModel(this.model, id, callback);
};

/**
 * 根据条件获取数据列表
 * @param {Array} conditions 条件
 * @param {boolean} [lock] 是否加锁删除
 * @param {Function} [callback] 用户信息
 */
Model.prototype.deleteByFields = function (conditions, lock, callback) {
    callback = callback || function () {};

    //  获取满足条件的id列表
    var self = this;
    this.getIDs(conditions, function (err, ids) {
        if (err || ids.length === 0) {
            return;
        }

        var count_done = 0;
        var count_deleted = 0;
        var onDeleteSuccess = function () {
            count_done++;
            if (count_done >= ids.length) {
                callback(null, count_deleted);
            }
        };

        //  删除函数
        var deleteFunc = function (id) {
            if (lock) {
                self.lockAndGet(id, function (err, data) {
                    if (err || !data) {
                        self.unlock(id);
                        onDeleteSuccess();
                    }

                    //  进行删除
                    self.delete(id, function (err) {
                        self.unlock(id);

                        if (!err)
                            count_deleted++;

                        onDeleteSuccess();
                    });
                });
            }
            else {
                //  进行删除
                self.delete(id, function (err) {
                    if (!err) {
                        count_deleted++;
                    }

                    onDeleteSuccess();
                });
            }
        };

        //  进行删除操作
        for (var i = 0; i < ids.length; i++) {
            deleteFunc(ids[i]);
        }
    });
};

/**
 * 加锁
 *
 * @param {string} id 编号
 * @return {String}
 */
Model.prototype.getLockKey = function (id) {
    return this.model + ':' + id;
};

/**
 * 加锁
 *
 * @param {string} id 编号
 * @param {function} callback 回调
 */
Model.prototype.lock = function (id, callback) {
    var key = this.getLockKey(id);
    Lock.lock(key, callback);
};

/**
 * 解锁
 *
 * @param {Object|String|number} lock 锁
 */
Model.prototype.unlock = function (lock) {
    if (lock == null) {
        return;
    }

    if (typeof (lock) === 'object') {
        Lock.unlock(lock);
    }
    else{
        var saved_lock = this.locks[lock];
        if (saved_lock)
            this.unlock(saved_lock);
    }
};

/**
 * 获取数据列表
 *
 * @param {Array} conditions 条件
 * @param {Array} sorts 排序顺序
 * @param {number} page_no 页号
 * @param {number} page_size 页面大小
 * @param {Function} callback 用户信息
 */
Model.prototype.getList = function (conditions, sorts, page_no, page_size, callback) {
    var self = this;
    Data.getByFieldsPaginationEx(this.model, conditions, sorts, page_no, page_size, function (err, data) {
        if (err) {
            return callback(err);
        }

        for (var i = 0; i < data.list.length; i++) {
            data.list[i] = self.deserializeData(data.list[i]);
        }
        callback(null, data);
    });
};

/**
 * 根据条件获取一个数据
 *
 * @param {Array} conditions 条件
 * @param {Function} callback 用户信息
 */
Model.prototype.getOne = function (conditions, callback) {
    var self = this;
    Data.getByFields(this.model, conditions, function (err, data) {
        if (err)
            return callback(err);

        if (!data || data.length === 0)
            return callback(null, null);

        var one = self.deserializeData(data[0]);
        return callback(null, one);
    });
};
/**
 * 根据条件获取数据列表
 *
 * @param {Array} conditions 条件
 * @param {Function} callback 用户信息
 */
Model.prototype.getByFields = function (conditions, callback) {
    var self = this;
    Data.getByFields(this.model, conditions, function (err, data) {
        if (err)
            return callback(err);

        for (var i = 0; i < data.length; i++) {
            data[i] = self.deserializeData(data[i]);
        }
        callback(null, data);
    });
};

/**
 * 根据查找条件获取model, 可以排序，可以分页
 *
 * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value]
 * @param {Array} sorts  排序数组, 数组元素为数组[field]或者[field, sort('desc' or 'asc')]
 * @param {Number} offset  查询位移, 如果不想分页的话offset传-1
 * @param {Number} limit  查询总数
 * @param {Function} callback  回调
 */
Model.prototype.getByFieldsEx = function (conditions, sorts, offset, limit, callback) {
    var self = this;
    Data.getByFieldsEx(this.model, conditions, sorts, offset, limit, function (err, data) {
        if (err)
            return callback(err);

        for (var i = 0; i < data.length; i++) {
            data[i] = self.deserializeData(data[i]);
        }
        callback(null, data);
    });
};

/**
 * 根据条件获取ID列表
 *
 * @param {Array} conditions 条件
 * @param {Function} callback 用户信息
 */
Model.prototype.getIDs = function (conditions, callback) {
    Data.getIDs(this.model, conditions, callback);
};

/**
 * 获取所有信息
 *
 * @param {Function} callback 回调
 */
Model.prototype.getAll = function(callback){
    this.getByFieldsEx([], [], -1, 0, callback);
};

/**
 * 获取数据总数
 *
 * @param callback
 */
Model.prototype.getCount = function (callback) {
    Data.getRowCount(this.model, [], callback);
};

/**
 * 获取数据总数, 包含过滤条件
 *
 * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value]
 * @param callback
 */
Model.prototype.getCountEx = function (conditions, callback) {
    Data.getRowCount(this.model, conditions, callback);
};

/**
 * 获取某列的总和
 *
 * @param {string} field 列名
 * @param callback
 */
Model.prototype.getSum = function (field, callback) {
    Data.getColumnSum(this.model, [], field, callback);
};

/**
 * 获取某列的总和, 根据条件进行帅选
 *
 * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value]
 * @param {string} field 列名
 * @param callback
 */
Model.prototype.getSumEx = function (conditions, field, callback) {
    Data.getColumnSum(this.model, conditions, field, callback);
};

/**
 * 获取query结果
 *
 * @param {String} sql  查询语句(?形式的准备语句)
 * @param {Array} [fields]  准备参数
 * @param {Function} [callback] 回调
 */
Model.prototype.query = function(sql, fields, callback){
    if (!fields)
        fields = [];

    callback = callback || function () {};

    Data.query(sql, fields, callback);
};

/**
 * 清除缓存中的内容
 *
 * @param {Function} [callback] 回调
 */
Model.prototype.clearCache = function(callback) {
    callback = callback || function () {};

    Data.clearCache(this.model, callback);
};

module.exports = Model;