/**
 * Created by leo on 12/3/2017.
 *
 * 【管理员操作日志】
 */
var Model = require('./model');

function AdminLogModel() {
    Model.call(this);

    this.model = 'admin_logs';

    /**
     * 新增管理者日志
     *
     * @param admin_id
     * @param type
     * @param title
     * @param content
     * @param ip_address
     */
    this.addLog = function (admin_id, type, title, content, ip_address) {
        var log = {};
        log.admin_id = admin_id;
        log.type = type;
        log.title = title && title.substr(0, 128);
        log.content = content && content.substr(0, 2048);
        log.ip = ip_address;
        log.created_at = UTIL.getTimeDesc();

        this.create(log);
    }
}

AdminLogModel.prototype = new Model();
AdminLogModel.prototype.constructor = AdminLogModel;

global.AdminLogModel = new AdminLogModel();
module.exports = global.AdminLogModel;