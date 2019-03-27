/**
 * Created by leo on 12/5/2017.
 *
 * 【统计信息】
 */
var Model = require('./model');

function StatisticModel() {
    Model.call(this);

    this.model = 'statistics';

    this.DT_ALL = 'all';
    this.DT_YEAR = 'year';
    this.DT_MONTH = 'month';
    this.DT_DATE = 'date';

    /**
     * 获取或者新增一个统计数据
     *
     * @param type: 类型
     * @param date: 日期
     * @param callback: 回调
     */
    this.getOrNew = function(type, date, callback) {
        var self = this;

        this.getByFields([['type', type], ['date', date]], function(err, result) {
            if (! err && result.length > 0) {
                return callback(err, result[0]);
            } else if (err) {
                return callback(err, null);
            } else {
                // 新增统计数据
                var st = {};
                st.date = date;
                st.type = type;

                self.create(st, callback);
            }
        });
    }
}

StatisticModel.prototype = new Model();
StatisticModel.prototype.constructor = StatisticModel;

global.StatisticModel = new StatisticModel();
module.exports = global.StatisticModel;