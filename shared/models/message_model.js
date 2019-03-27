/**
 * Created by leo on 12/5/2017.
 *
 * 【消息】
 */
var Model = require('./model');

function MessageModel() {
    Model.call(this);

    this.model = 'messages';

    this.TYPE = {
        GEM_PURCHASE: 'fkgm',                                                                                           // 房卡购买提示
        NOTICE_HALL: 'notice_hall',                                                                                     // 大厅喇叭消息
        NOTICE_ROOM: 'notice_room',                                                                                     // 房间喇叭消息
        SYSTEM: 'system',                                                                                               // 用户系统公告
        AGREEMENT: 'agreement'                                                                                          // 用户协议
    };

    /**
     * 根据类型获取消息
     *
     * @param type: 类型
     * @param callback: 回调
     */
    this.getByType = function(type, callback) {
        this.getByFields([['type', type]], function(err, result) {
            if (! err && result.length > 0) {
                callback(err, result[0]);
            } else {
                callback(err, null);
            }
        });
    };
}

MessageModel.prototype = new Model();
MessageModel.prototype.constructor = MessageModel;

global.MessageModel = new MessageModel();
module.exports = global.MessageModel;