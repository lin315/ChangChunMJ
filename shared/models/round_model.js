/**
 * Created by leo on 12/5/2017.
 *
 * 【游戏回合】
 */
var Model = require('./model');

function RoundModel() {
    Model.call(this);

    this.model = 'rounds';
    this.json_fields = ['round_info', 'round_result', 'action_list'];

    /**
     * 保存一回合游戏信息
     *
     * @param room: 房间信息
     * @param callback: 回调
     */
    this.saveRound = function(room, callback) {
        //  产生随机的房间id
        var round_id = UTIL.randomNumber(7);

        var self = this;
        // 检查房间是否存在
        this.getByID(round_id, function(err, round) {
            if (err) {
                return callback(err);
            }

            // 该回合号（回放码）已存在, 需要重新生成
            if (round) {
                return self.saveRound(room, callback);
            }

            // 创建回合信息
            round = {
                id: round_id,
                room_id: room.id,
                round_no: room.round_no,
                round_info: room.round_info,
                round_result: room.round_result,
                action_list: room.action_list,
                created_at: UTIL.getTimeDesc()
            };

            self.create(round, callback);
        });
    };
}

RoundModel.prototype = new Model();
RoundModel.prototype.constructor = RoundModel;

global.RoundModel = new RoundModel();
module.exports = global.RoundModel;