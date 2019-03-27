/**
 * Created by leo on 5/20/2018.
 */
var Model = require('./model');

function CheckInModel() {
    Model.call(this);

    this.model = 'check_ins';

    /**
     * 创建用户的签到记录
     *
     * @param user_id
     * @param date
     * @param callback
     */
    this.createRecord = function(user_id, date, callback) {
        var record = {
            user_id: user_id,
            date: date,
            created_at: UTIL.getTimeDesc()
        };

        this.create(record, callback);
    };

    /**
     * 清理指定日期之前的所有记录
     *
     * @param date
     */
    this.cleanRecords = function(date) {
        this.query('delete from ' + this.model + ' where created_at <= "' + date + '"');
        this.clearCache();
    };
}

CheckInModel.prototype = new Model();
CheckInModel.prototype.constructor = CheckInModel;

global.CheckInModel = new CheckInModel();
module.exports = global.CheckInModel;