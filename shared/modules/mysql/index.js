var mysql = require("mysql");

function MysqlModule() {
    this.pool = null;
    this.app = null;
    this.config = null;

    /**
     * 获取query结果
     *
     * @param {String} sql  查询语句(?形式的准备语句)
     * @param {Array} fields  准备参数
     * @param {Function} callback 回调
     */
    this.query = function(sql, fields, callback){
        //  fields可空
        if (fields instanceof Function) {
            callback = fields;
            fields = [];
        }

        var self = this;
        this.pool.getConnection(function(err, conn){
            if (err) {
                callback(err, null, null);
            }
            else {
                conn.query(sql, fields, function(qerr, vals, fields){
                    //释放连接
                    conn.release();

                    if (qerr) {
                        console.error(sql + '\n' + qerr.message);
                    }

                    //事件驱动回调
                    callback(qerr, vals, fields);
                });
            }
        });
    };

    /**
     * 根据编号获取model
     *
     * @param {String} model  模型名称/表格名称
     * @param {String} id  编号
     * @param {Function} callback 回调
     */
    this.getByID = function (model, id, callback){
        var sql = "select * from " + model + " where id = ?";
        this.query(sql, [id], function(err, rows) {//}, fields) {
            if (err) {
                callback(err);
                return;
            }

            if (rows.length == 0)
                callback(null, null);
            else
                callback(null, rows[0]);
        });
    };

    /**
     * 根据查找条件获取model
     *
     * @param {String} model  模型名称即表格名称
     * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value]
     * @param {Function} callback 回调
     */
    this.getByFields = function (model, conditions, callback){
        //  组合sql查询条件
        var condition_result = getConditionStrs(conditions);
        var condition_strs = condition_result.conditions;
        var values = condition_result.values;

        //  组合sql语句
        var sql = "select * from " + model;
        if (condition_strs.length > 0)
            sql = sql + " where " + condition_strs.join(" and ");

        //进行查询
        this.query(sql, values, function(err, rows) {//}, fields) {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, rows);
        });
    };

    /**
     * 查找满足条件的模型的ID数组
     *
     * @param {String} model  模型名称即表格名称
     * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value]
     * @param {Function} callback 回调
     */
    this.getIDs = function (model, conditions, callback){
        //  组合sql查询条件
        var condition_result = getConditionStrs(conditions);
        var condition_strs = condition_result.conditions;
        var values = condition_result.values;

        //  组合sql语句
        var sql = "select id from " + model;
        if (condition_strs.length > 0)
            sql = sql + " where " + condition_strs.join(" and ");

        //进行查询
        this.query(sql, values, function(err, rows) {//}, fields) {
            if (err) {
                callback(err, null);
                return;
            }

            var id_list = [];
            for (var i = 0; i < rows.length; i++)
                id_list.push(rows[i].id);

            callback(null, id_list);
        });
    };

    /**
     * 获取条件组合数组
     *
     * @param {Array} conditions 条件
     */
    function getConditionStrs(conditions) {
        var condition_strs = [];
        var values = [];
        for (var i = 0; i < conditions.length; i++) {
            var condition = conditions[i];
            if (condition.length == 2) {
                condition_strs.push(condition[0] + '=?');
                values.push(condition[1]);
            }
            else if (condition.length == 3) {
                if (condition[1] == 'in') {
                    if (condition[2].length > 0) {
                        var in_values = [];
                        for (var j = 0; j < condition[2].length; j++)
                            in_values.push("'" + condition[2][j] + "'");
                        var in_str = "(" + in_values.join(",") + ")";
                        condition_strs.push(condition[0] + ' in ' + in_str);
                    }
                    else {
                        condition_strs.push("1=2");
                    }
                }
                else {
                    condition_strs.push(condition[0] + ' ' + condition[1] + ' ' + '?');
                    values.push(condition[2]);
                }
            }
        }

        return {
            conditions: condition_strs,
            values: values
        };
    }

    /**
     * 获取排序数组
     *
     * @param {Array} sorts 排序描述
     */
    function getSortStrs(sorts) {
        //  组合排序条件
        var sort_strs = [];
        for (var i = 0; i < sorts.length; i++) {
            var sort = sorts[i];
            if (sort.length == 1) {
                sort_strs.push(sort[0]);
            }
            else if (sort.length == 2) {
                sort_strs.push(sort[0] + ' ' + sort[1]);
            }
        }

        return sort_strs;
    }

    /**
     * 根据查找条件获取model, 可以排序，可以分页
     *
     * @param {String} model  模型名称即表格名称
     * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value], in查询的时候value是数组
     * @param {Array} sorts  排序数组, 数组元素为数组[field]或者[field, sort('desc' or 'asc')]
     * @param {Number} offset  查询位移, 如果不想分页的话offset传-1
     * @param {Number} limit  查询总数
     * @param {Function} callback  回调
     */
    this.getByFieldsEx = function (model, conditions, sorts, offset, limit, callback){
        //  组合sql查询条件
        var condition_result = getConditionStrs(conditions);
        var condition_strs = condition_result.conditions;
        var values = condition_result.values;
        var sort_strs = getSortStrs(sorts);

        //  组合sql语句
        var sql = "select * from " + model;
        if (condition_strs.length > 0)
            sql = sql + " where " + condition_strs.join(" and ");
        if (sort_strs.length > 0)
            sql = sql + " order by " + sort_strs.join(",");
        if (offset >= 0)
            sql = sql + " limit " + limit + " offset " + offset;

        // 进行查询
        this.query(sql, values, function(err, rows) {//}, fields) {
            if (err) {
                callback(err, null);
                return;
            }

            callback(null, rows);
        });
    };

    /**
     * 根据查找条件获取model, 可以排序，分页
     *
     * @param {String} model  模型名称即表格名称
     * @param {Array} conditions  查询数组, 数组中每项也是一个数组[field, value]或者[field, condition, value], in查询的时候value是数组
     * @param {Array} sorts  排序数组, 数组元素为数组[field]或者[field, sort('desc' or 'asc')]
     * @param {Number} page_no  页号(1开始)
     * @param {Number} page_size  查询总数
     * @param {Function} callback  回调
     */
    this.getByFieldsPaginationEx = function (model, conditions, sorts, page_no, page_size, callback){
        //  组合sql查询条件
        var condition_result = getConditionStrs(conditions);
        var condition_strs = condition_result.conditions;
        var values = condition_result.values;
        var sort_strs = getSortStrs(sorts);

        //  组合sql语句
        var sql = "select count(*) from " + model;
        if (condition_strs.length > 0)
            sql = sql + " where " + condition_strs.join(" and ");

        //  获取总数
        var self = this;
        this.query(sql, values, function (err, rows) {//}, fields) {
            if (err) {
                callback(err, null);
                return;
            }

            var total_count = rows[0]['count(*)'];
            page_size = page_size > 0 ? page_size : 1;
            var show_count = page_size;
            page_no = page_no > 0 ? page_no : 1;
            var page_count = Math.ceil(total_count / page_size);
            if (page_count >= 1 && page_no >= page_count) {
                page_no = page_count;
                show_count = total_count - (page_no - 1) * page_size;
            }

            //  真正进行查询
            sql = sql.replace('select count(*)', 'select *');
            if (sort_strs.length > 0)
                sql = sql + " order by " + sort_strs.join(",");
            sql = sql + " limit " + show_count + " offset " + (page_no - 1) * page_size;
            self.query(sql, values, function(err, rows) {//}, fields) {
                if (err) {
                    callback(err, null);
                    return;
                }

                callback(null, {
                    list: rows,
                    page_no: page_no,
                    page_count: page_count,
                    page_size: page_size,
                    total_count: total_count,
                    show_count: show_count
                });
            });
        });
    };

    /**
     * 获取数据库中满足条件的记录数
     *
     * @param {String} model 模型名称
     * @param {Array} conditions 条件
     * @param {Function} callback
     */
    this.getRowCount = function (model, conditions, callback) {
        var condition_result = getConditionStrs(conditions);
        var condition_strs = condition_result.conditions;
        var values = condition_result.values;

        //  获取总数
        //  组合sql语句
        var sql = "select count(*) from " + model;
        if (condition_strs.length > 0)
            sql = sql + " where " + condition_strs.join(" and ");
        this.query(sql, values, function (err, rows) {//}, fields) {
            if (err) {
                callback(err, null);
                return;
            }

            return callback(null, rows[0]['count(*)']);
        });
    };

    /**
     * 获取数据库中某一列的总和
     *
     * @param {String} model 模型名称
     * @param {Array} conditions 条件
     * @param {String} column 列名称
     * @param {Function} callback
     */
    this.getColumnSum = function (model, conditions, column, callback) {
        var condition_result = getConditionStrs(conditions);
        var condition_strs = condition_result.conditions;
        var values = condition_result.values;

        //  获取总数
        //  组合sql语句
        var sql = "select sum(" + column + ") as sum from " + model;
        if (condition_strs.length > 0)
            sql = sql + " where " + condition_strs.join(" and ");

        this.query(sql, values, function (err, rows) {//}, fields) {
            if (err) {
                callback(err, null);
                return;
            }

            var sum = rows[0]['sum'];
            if (!sum)
                sum = 0;

            return callback(null, sum);
        });
    };

    /**
     * 新增一个模型记录
     *
     * @param {String} model 模型名称即表格名称
     * @param {Object} data 模型数据
     * @param {Function} callback 回调
     */
    this.createModel = function (model, data, callback){
        //  组合sql插入条件
        var field_strs = [];
        var value_questions = [];
        var values = [];

        for (var field in data) {
            var val = data[field];

            field_strs.push(field);
            value_questions.push('?');
            values.push(val);
        }

        //  组合sql语句
        var sql = "insert into " + model;
        if (field_strs.length > 0) {
            sql = sql + "(" + field_strs.join(",") + ") values(" + value_questions.join(",") + ")";
        }
        else
            return callback(new Error('can not create model:data has no field'));

        //进行插入
        var self = this;
        this.query(sql, values, function (err, ret) {
            if (err)
                return callback(err);

            var new_id;
            if (data.id)
                new_id = data.id;
            else
                new_id = ret.insertId;
            self.getByID(model, new_id, callback);
        });
    };

    /**
     * 更新一个模型记录
     *
     * @param {String} model 模型名称即表格名称
     * @param {Object} data 模型数据
     * @param {Function} callback 回调
     */
    this.saveModel = function (model, data, callback){
        //  组合sql更新条件
        var field_strs = [];
        var values = [];

        for (var field in data) {
            var val = data[field];

            field_strs.push(field + "=?");
            values.push(val);
        }

        //  组合sql语句
        var sql = "update " + model + " set ";
        if (field_strs.length > 0) {
            sql += field_strs.join(",");
        }
        else
            return callback(new Error('can not save model:data has no field'));

        //  查询条件
        sql += " where id = ?";
        values.push(data.id);

        // 进行更新
        var self = this;
        this.query(sql, values, function (err) {//}, ret) {
            if (err)
                return callback(err);

            self.getByID(model, data.id, callback);
        });
    };

    /**
     * 删除一个模型记录
     *
     * @param {String} model 模型名称即表格名称
     * @param {number} id 模型id
     * @param {Function} callback 回调
     */
    this.deleteModel = function (model, id, callback){
        //  查询条件
        var sql = "delete from " + model + " where id = ?";

        // 进行删除
        this.query(sql, [id], function (err) {//}, ret) {
            if (err)
                return callback(err);

            callback(null);
        });
    };

    /**
     * 初始化
     *
     * @param {Object} app 应用
     * @param {Object} config 设置
     * @param {Function} [callback] 回调
     */
    this.init = function (app, config, callback) {
        callback = callback || function () {};

        this.app = app;
        this.config = config;

        this.pool = mysql.createPool({
            host: config.HOST,
            user: config.USER,
            password: config.PASSWORD,
            database: config.DB,
            port: config.PORT,
            charset: config.CHARSET
        });

        callback(null);
    };
}

module.exports = new MysqlModule();