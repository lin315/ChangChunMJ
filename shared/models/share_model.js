/**
 * Created by leo on 12/5/2017.
 *
 * 【分享记录（签到）】
 */
var Model = require('./model');

function ShareModel() {
    Model.call(this);

    this.model = 'shares';

    /**
     * 创建用户的分享记录
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

ShareModel.prototype = new Model();
ShareModel.prototype.constructor = ShareModel;

global.ShareModel = new ShareModel();
module.exports = global.ShareModel;