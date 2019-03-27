/**
 * Created by leo on 12/5/2017.
 *
 * 【游戏房间】
 */
var Model = require('./model');

function RoomModel() {
    Model.call(this);

    this.model = 'rooms';
    this.json_fields = ['settings', 'players', 'result'];
    this.private_fields = ['server_id'];

    this.TYPE = {
        PRIVATE: 'private',
        MATCH: 'match',
        CLUB: 'club'
    };

    /**
     * 创建游戏房间
     *
     * @param conf: 创建信息
     *      game_id - 游戏ID
     *      type - 房间类型(private/club/match)
     *      club_id(optional) - 俱乐部ID
     *      club_room_setting_id(optional) - 俱乐部创建选项ID
     *      match_field_id(optional) - 比赛场ID
     *      match_round_no(optional) - 比赛场第几回合
     *      creator - 创建者ID
     *      needed_gems - 所需钻石
     *      max_player_count - 最大玩家数
     *      settings - 创建选项
     * @param server_id: 游戏服务器ID
     * @param callback: 回调
     */
    this.createRoom = function(conf, server_id, callback) {
        //  产生随机的房间id
        var room_id = UTIL.randomNumber(6);

        var self = this;
        // 检查房间是否存在
        this.getByID(room_id, function(err, room) {
            if (err) {
                return callback(err);
            }

            // 房间已存在, 需要重新生成
            if (room) {
                return self.createRoom(conf, server_id, callback);
            }

            // 创建房间
            room = {
                id: room_id,
                game_id: conf.game_id,
                server_id: server_id,
                type: conf.type,
                club_id: (conf.club_id ? conf.club_id : 0),
                club_room_setting_id: (conf.club_room_setting_id ? conf.club_room_setting_id : 0),
                match_field_id: (conf.match_field_id ? conf.match_field_id : ''),
                match_round_no: (conf.match_round_no ? conf.match_round_no : 0),
                settings: conf.settings,
                creator: conf.creator,
                needed_gems: conf.needed_gems,
                max_player_count: conf.max_player_count,
                round_no: 0,
                status: CONST.ROOM_STATUS.WAITING,
                created_at: UTIL.getTimeDesc()
            };

            self.create(room, callback);
        });
    };

    /**
     * 回收房间
     *
     * @param server_id: 游戏服务器ID
     * @param callback
     */
    this.recycleRooms = function(server_id, callback) {
        callback = callback || function() {};

        var self = this;
        var removeFunc = function(err, rooms) {
            if (err) {
                return callback(err);
            }

            for (var i = 0; i < rooms.length; i++) {
                var room = rooms[i];

                // 清空玩家房间记录
                for (var j = 0; j < room.players.length; j++) {
                    var player_id = room.players[j];
                    if (player_id) {
                        UserModel.clearRoomID(player_id, true);
                    }
                }

                // 删除房间信息
                self.delete(room.id);

                console.log('游戏服务器', server_id, '的房间', room.id, '被回收');
            }
        };

        this.getByFields([['server_id', server_id], ['status', '!=', CONST.ROOM_STATUS.FINISHED]], removeFunc);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  统计相关
    //
    //  getRoomCount:                       指定日期结束的房间
    //  getPrivateRoomCount:                指定日期结束的好友房间
    //  getClubRoomCount:                   指定日期结束的俱乐部房间
    //  getMatchRoomCount:                  指定日期结束的比赛场房间
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Playing Now Club Room Count
     */
    this.getPlayingClubRoomCount = function(club_id, callback) {
        var conditions = [['status', CONST.ROOM_STATUS.PLAYING], ['club_id', '=', club_id]];
        this.getCountEx(conditions, callback);
    };

    /**
     * Waiting Now Club Room Count
     */
    this.getWaitingClubRoomCount = function(club_id, callback) {
        var conditions = [['status', CONST.ROOM_STATUS.WAITING], ['club_id', '=', club_id]];
        this.getCountEx(conditions, callback);
    };


    /**
     * 指定日期结束的所有房间
     *
     * @param date
     * @param callback
     */
    this.getRoomCount = function(date, callback) {
        var conditions = [['status', CONST.ROOM_STATUS.FINISHED], ['finished_at', 'like', date + '%']];

        this.getCountEx(conditions, callback);
    };

    /**
     * 指定日期结束的好友房间
     *
     * @param date
     * @param callback
     */
    this.getPrivateRoomCount = function(date, callback) {
        var conditions = [
            ['status', CONST.ROOM_STATUS.FINISHED],
            ['finished_at', 'like', date + '%'],
            ['type', this.TYPE.PRIVATE]
        ];

        this.getCountEx(conditions, callback);
    };

    /**
     * 指定日期结束的俱乐部房间
     *
     * @param date
     * @param callback
     */
    this.getClubRoomCount = function(date, callback) {
        var conditions = [
            ['status', CONST.ROOM_STATUS.FINISHED],
            ['finished_at', 'like', date + '%'],
            ['type', this.TYPE.CLUB]
        ];

        this.getCountEx(conditions, callback);
    };

    /**
     * 指定日期结束的比赛场房间
     *
     * @param date
     * @param callback
     */
    this.getMatchRoomCount = function(date, callback) {
        var conditions = [
            ['status', CONST.ROOM_STATUS.FINISHED],
            ['finished_at', 'like', date + '%'],
            ['type', this.TYPE.MATCH]
        ];

        this.getCountEx(conditions, callback);
    };
}

RoomModel.prototype = new Model();
RoomModel.prototype.constructor = RoomModel;

global.RoomModel = new RoomModel();
module.exports = global.RoomModel;