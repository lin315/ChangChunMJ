/**
 * Created by leo on 7/2/2018.
 *
 * 【比赛场报名表】
 */

var Model = require('./model');

function MatchEntryFormModel() {
    Model.call(this);

    this.model = 'match_entry_forms';

    this.STATUS = {
        WAITING: 'waiting',
        CHECKED: 'checked',
        REJECTED: 'rejected'
    }

    /**
     * 清理指定日期之前的所有日赛记录
     *
     * @param date
     */
    this.cleanDailyRecords = function(date) {
        this.query('delete from ' + this.model + ' where created_at <= "' + date + '" and type = "' + (CONST.MATCH_TYPE.DAY) + '"');
        this.clearCache();
    };
}

MatchEntryFormModel.prototype = new Model();
MatchEntryFormModel.prototype.constructor = MatchEntryFormModel;

global.MatchEntryFormModel = new MatchEntryFormModel();
module.exports = global.MatchEntryFormModel;