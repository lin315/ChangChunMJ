/**
 * Created by leo on 4/16/2018.
 */

var Model = require('./model');

function ClubRoomSettingModel() {
    Model.call(this);

    this.model = 'club_room_settings';
    this.json_fields = ['settings'];

    /**
     * 批量创建房间选项
     *
     * @param setting
     * @param count
     * @param callback
     */
    var self = this;
    this.createBatch = function(setting, count, callback) {
        var created_count = 0;
        var list = [];

        for (var i = 0; i < count; i++) {
            self.create(setting, function(err, result) {
                created_count ++;

                if (! err) {
                    list.push(result);
                }

                if (created_count === count) {
                    callback(err, list);
                }
            });
        }
    };
}

ClubRoomSettingModel.prototype = new Model();
ClubRoomSettingModel.prototype.constructor = ClubRoomSettingModel;

global.ClubRoomSettingModel = new ClubRoomSettingModel();
module.exports = global.ClubRoomSettingModel;