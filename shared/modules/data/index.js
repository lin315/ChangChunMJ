function DataModule() {
    this.pool = null;
    this.app = null;
    this.cache = null;
    this.DB = null;
    this.config = null;

    /**
     * 获取query结果
     * @param {String} sql  查询语句(?形式的准备语句)
     * @param {Array} [fields]  准备参数
     * @param {Function} [callback] 回调
     */
    this.query = function(sql, fields, callback){
        if (!fields)
            fields = [];

        callback = callback || function () {};

        this.DB.query(sql, fields, callback);
    };

    /**
     * 根据编号获取model
     * @param {String} model 模型名称/表格名称
     * @param {String} id 编号
     * @param {Function} callback 回调
     */
    this.getByID = function (model, id, callback) {
        var self = this;
        var getFromDB = function () {
            //  从数据库中读取
            self.DB.getByID(model, id, function (err, res) {
                if (err) {
                    if (self.config.log)
                        console.error('Error at Data.getByID:' + err.message);

                    return callback(err);
                }

                //  如果不存在直接返回
                if (!res)
                    return callback(null, res);

                //  如果存在的话保存到缓存, 然后返回
                if (self.cache)
                    self.cache.saveModel(model, res, callback);
                else
                    callback(null, res);
            });
        };

        //  如果开启了缓存模式
        if (this.cache) {
            //  先在缓存中去查找
            this.cache.getByID(model, id, function (err, res) {
                if (err) {
                    if (self.config.log)
                        console.error('Error at Data.getByID:' + err.message);

                    return callback(err);
                }

                //  如果在缓存中的话，直接返回
                if (res) {
                    return callback(null, res);
                }
                else {
                    getFromDB();
                }
            });
        }
        else
            getFromDB();
    };

    /**
     * 根据编号删除model
     * @param {string} model 模型名称/表格名称
     * @param {string} id 编号
     * @param {function} [callback] 回调
     */
    this.deleteModel = function (model, id, callback) {
        callback = callback || function () {};

        var self = this;
        if (this.cache) {
            //  先从缓存中删除
            this.cache.deleteModel(model, id, function (err) {
                if (err) {
                    if (self.config.log)
                        console.error('Error at Data.deleteModel:' + err.message);

                    return callback(err);
                }

                //  从数据库中删除
                self.DB.deleteModel(model, id, callback);
            });
        }
        else
            this.DB.deleteModel(model, id, callback);
    };

    /**
     * 清除缓存中的内容
     * @param {string} model 模型名称/表格名称
     * @param {function} [callback] 回调
     */
    this.clearCache = function(model, callback) {
        callback = callback || function () {};

        if (this.cache) {
            this.cache.clearModels(model, callback);
        } else {
            callback(true);
        }
    };

    /**
     * 根据查找条件获取model
     * @param {String} model  模型名称即表格名称
     * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value]
     * @param {Function} callback 回调
     */
    this.getByFields = function (model, conditions, callback) {
        //  暂时不用缓存
        this.DB.getByFields(model, conditions, callback);
    };

    /**
     * 根据查找条件获取model, 可以排序，可以分页
     * @param {String} model  模型名称即表格名称
     * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value]
     * @param {Array} sorts  排序数组, 数组元素为数组[field]或者[field, sort('desc' or 'asc')]
     * @param {Number} offset  查询位移, 如果不想分页的话offset传-1
     * @param {Number} limit  查询总数
     * @param {Function} callback  回调
     */
    this.getByFieldsEx = function (model, conditions, sorts, offset, limit, callback) {
        //  暂时不用缓存
        this.DB.getByFieldsEx(model, conditions, sorts, offset, limit, callback);
    };

    /**
     * 查找满足条件的模型的ID数组
     * @param {String} model  模型名称即表格名称
     * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value]
     * @param {Function} callback 回调
     */
    this.getIDs = function (model, conditions, callback) {
        //  暂时不用缓存
        this.DB.getIDs(model, conditions, callback);
    };

    /**
     * 根据查找条件获取model, 可以排序，分页
     * @param {String} model  模型名称即表格名称
     * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value], in查询的时候value是数组
     * @param {Array} sorts  排序数组, 数组元素为数组[field]或者[field, sort('desc' or 'asc')]
     * @param {Number} page_no  页号(1开始)
     * @param {Number} page_size  查询总数
     * @param {Function} callback  回调
     */
    this.getByFieldsPaginationEx = function (model, conditions, sorts, page_no, page_size, callback) {
        //  暂时不用缓存
        this.DB.getByFieldsPaginationEx(model, conditions, sorts, page_no, page_size, callback);
    };

    /**
     * 获取数据库中满足条件的记录数
     * @param {String} model 模型名称
     * @param {Array} conditions 条件
     * @param {Function} callback 回调
     */
    this.getRowCount = function (model, conditions, callback) {
        this.DB.getRowCount(model, conditions, callback);
    };

    /**
     * 获取数据库中某一列的总和
     * @param {String} model 模型名称
     * @param {Array} conditions 条件
     * @param {String} column 列名称
     * @param {Function} callback 回调
     */
    this.getColumnSum = function (model, conditions, column, callback) {
        this.DB.getColumnSum(model, conditions, column, callback);
    };

    /**
     * 新增一个模型记录
     * @param {String} model 模型名称即表格名称
     * @param {Object} data 模型数据
     * @param {Function} callback 回调
     */
    this.createModel = function (model, data, callback) {
        callback = callback || function () {};

        //  创建模型
        var self = this;
        this.DB.createModel(model, data, function (err, res) {
            if (err) {
                if (self.config.log)
                    console.error('Error at Data.createModel:' + err.message);

                return callback(err);
            }

            //  保存到缓存
            if (self.cache) {
                self.cache.saveModel(model, res, callback);
            }

            return callback(null, res);
        });
    };

    /**
     * 更新一个模型记录
     * @param {String} model 模型名称即表格名称
     * @param {Object} data 模型数据
     * @param {Function} callback 回调
     */
    this.saveModel = function (model, data, callback) {
        callback = callback || function () {};

        //  保存数据
        var self = this;
        this.DB.saveModel(model, data, function (err, res) {
            if (err) {
                if (self.config.log)
                    console.error('Error at Data.saveModel:' + err.message);

                return callback(err);
            }

            //  保存到缓存
            if (self.cache) {
                self.cache.saveModel(model, res, callback);
            }

            callback(null, res);
        });
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

        if (config.type != 'mysql') {
            return callback(new Error('DB type is not supported!'));
        }

        var module_manager = app.module_manager;
        this.DB = module_manager.getModule(CONST.MODULE.MYSQL);

        if (config.use_cache)
            this.cache = module_manager.getModule(CONST.MODULE.CACHE);
        else
            this.cache = null;

        callback(null);
    };
}

module.exports = new DataModule();