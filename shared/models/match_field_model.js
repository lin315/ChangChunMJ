/**
 * Created by leo on 7/13/2018.
 *
 * 【比赛场表】
 */

var Model = require('./model');

function MatchFieldModel() {
    Model.call(this);

    this.model = 'match_fields';

    /**
     * 创建比赛场
     *
     * @param conf
     *      type - 比赛场类型(日赛/月赛)
     *      start_hour_in_24 - 开赛时间(24小时格式)
     * @param server_id
     * @param callback
     */
    this.createMatchField = function(conf, server_id, callback) {
        var self = this;

        //  产生随机的房间id
        var match_field_id = UTIL.randomNumber(7);

        if (conf.type === CONST.MATCH_TYPE.DAY) {
            match_field_id = 'D' + match_field_id;
        } else {
            match_field_id = 'W' + match_field_id;
        }

        // 检查房间是否存在
        this.getByID(match_field_id, function(err, match_field) {
            if (err) {
                return callback(err);
            }

            // 比赛场ID已存在, 需要重新生成
            if (match_field) {
                return self.createMatchField(conf, server_id, callback);
            }

            // 创建房间
            match_field = {
                id: match_field_id,
                server_id: server_id,
                type: conf.type,
                start_hour_in_24: conf.start_hour_in_24,
                status: CONST.MATCH_FIELD_STATUS.WAITING,
                round_no: 0,
                created_at: UTIL.getTimeDesc()
            };

            self.create(match_field, callback);
        });
    };

    /**
     * 回收比赛场
     *
     * @param server_id
     * @param callback
     */
    this.recycleMatchFields = function(server_id, callback) {
        callback = callback || function() {};

        var self = this;
        var removeFunc = function(err, match_fields) {
            if (err) {
                return callback(err);
            }

            for (var i = 0; i < match_fields.length; i++) {
                var match_field = match_fields[i];

                // 删除比赛场
                self.delete(match_field.id);

                console.log('游戏服务器', server_id, '的房间', match_field.id, '被回收');
            }
        };

        this.getByFields([['server_id', server_id], ['status', '!=', CONST.MATCH_FIELD_STATUS.FINISHED]], removeFunc);
    };
}

MatchFieldModel.prototype = new Model();
MatchFieldModel.prototype.constructor = MatchFieldModel;

global.MatchFieldModel = new MatchFieldModel();
module.exports = global.MatchFieldModel;