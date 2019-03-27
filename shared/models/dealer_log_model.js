/**
 * Created by leo on 5/30/2018.
 *
 * 【代理操作日志】
 */

var Model = require('./model');

function DealerLogModel() {
    Model.call(this);

    this.model = 'dealer_logs';
    this.json_fields = ['content'];

    this.TYPE = {
        AWARD_USER_GEMS: 'award_user_gems',
        AWARD_CLUB_GEMS: 'award_club_gems'
    };

    /**
     * 新增代理操作日志
     *
     * @param dealer_id
     * @param type
     * @param content
     */
    this.addLog = function(dealer_id, type, content) {
        var log = {};
        log.dealer_id = dealer_id;
        log.type = type;
        log.content = content && content.substr(0, 2048);
        log.created_at = UTIL.getTimeDesc();

        this.create(log);
    };
}

DealerLogModel.prototype = new Model();
DealerLogModel.prototype.constructor = DealerLogModel;

global.DealerLogModel = new DealerLogModel();
module.exports = global.DealerLogModel;
