/**
 * Created by leo on 11/8/2017.
 */

var Event = module_manager.getModule(CONST.MODULE.EVENT);

var GameRoom = require('./game_room');
var MatchField = require('./match_field');

var GameEngine = function() {
    this.app = null;

    this.time = 0;
    this.game_modules = [];
    this.game_rooms = {};
    this.user_known_rooms = {};                                                                                         //  用户加入过的有效房间
    this.match_fields = {};                                                                                             //  比赛场

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  初始化
    //
    //  init:   初始化
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    this.init = function(main_app) {
        var self = this;
        this.app = main_app;
        this.server_id = main_app.get('serverId');

        // 回收服务器的所有房间
        RoomModel.recycleRooms(this.server_id);

        // 回收服务器的所有比赛场
        MatchFieldModel.recycleMatchFields(this.server_id);

        // 加载子游戏模块
        GameModel.getActiveGames(function(err, games) {
            if (err || ! games) {
                return;
            }

            for (var i = 0; i < games.length; i++) {
                var game = games[i];
                self.game_modules[game.id] = require('./' + game.type + '/' + game.id);
            }
        });

        this.time = Date.now();

        // 开始执行游戏逻辑
        this.update();
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  游戏模块相关
    //
    //  isGameRunning:              游戏Module是否有效
    //  getGameModule:              获取游戏Module
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 游戏Module是否有效
     *
     * @param game_id
     * @returns {Array|*}
     */
    this.isGameRunning = function(game_id) {
        return (this.game_modules && this.game_modules[game_id]);
    };

    /**
     * 获取游戏Module
     *
     * @param game_id
     * @returns {*}
     */
    this.getGameModule = function(game_id) {
        if (! this.game_modules) {
            return null;
        }

        return this.game_modules[game_id];
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  游戏房间相关
    //
    //  getGameRoom:                        获取游戏房间
    //  getGameRoomOfPlayer:                获取玩家所在的游戏房间
    //
    //  createGameRoom:                     创建游戏房间
    //
    //  setKnownRoom:                       用户访问过的房间做下记录
    //  lookupRooms:                        获取用户访问过的有效房间, 推送给用户
    //  removeKnownRoom:                    从历史房间记录删除指定的房间
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 获取游戏房间
     *
     * @param room_id
     * @returns {*}
     */
    this.getGameRoom = function(room_id) {
        if (! this.game_rooms) {
            return null;
        }

        return this.game_rooms[room_id];
    };

    /**
     * 获取玩家所在的游戏房间
     *
     * @param player_id
     */
    this.getGameRoomOfPlayer = function(player_id) {
        if (! this.game_rooms) {
            return null;
        }

        for (var room_id in this.game_rooms) {
            var room = this.game_rooms[room_id];
            if (room.getPlayer(player_id)) {
                return room;
            }
        }

        return null;
    };

    /**
     * 创建游戏房间
     *
     * @param conf: 游戏创建参数
     *      game_id - 游戏ID
     *      type - 房间类型(private/club)
     *      club_id(optional) - 俱乐部ID
     *      settings - 游戏创建选项
     *      creator - 创建者ID
     * @param callback
     * @returns {*}
     */
    this.createGameRoom = function(conf, callback) {
        var self = this;
        var game_module = this.getGameModule(conf.game_id);

        if (! game_module) {
            return callback(new Error(ERROR.GAME_MODULE_NOT_FOUND));
        }

        // 根据不同子游戏, 追加最大玩家人数
        if (conf.settings.player_count > 0) {
            conf.max_player_count = conf.settings.player_count;
        } else {
            conf.max_player_count = game_module.getMaxPlayerCount();
        }

        RoomModel.createRoom(conf, this.server_id, function(err, room) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 房间创建成功
            var createRoomFinished = function() {
                var channel_service = self.app.get('channelService');
                var game_room = new GameRoom(self, null, channel_service, room, game_module);
                self.game_rooms[game_room.id] = game_room;

                return callback(null, game_room);
            };

            if (conf.type === CONST.ROOM_TYPE.PRIVATE) {
                // 私人房间
                if (game_module.isCreatorPayMethod(conf.settings)) {
                    // 1. 如果是【创建者支付】, 扣取用户的钻石
                    UserModel.lockAndGet(room.creator, function (err, user) {
                        if (err || !user) {
                            UserModel.unlock(room.creator);
                            return callback(new Error(ERROR.MODEL_NOT_FOUND));
                        }

                        // 更新用户信息
                        user.gems -= conf.needed_gems;

                        UserModel.save(user, function (err) {
                            UserModel.unlock(room.creator);

                            if (err) {
                                return callback(new Error(ERROR.INVALID_OPERATION));
                            }

                            // 房间创建成功了
                            createRoomFinished();
                        });
                    });
                } else {
                    // 2. 其他情况, 直接返回
                    createRoomFinished();
                }
            } else if (conf.type === CONST.ROOM_TYPE.CLUB) {
                // 俱乐部, 扣取俱乐部房卡
                var club_id = conf.club_id;
                ClubModel.getByID(club_id, function(err, club) {
                    if (err || ! club) {
                        return callback(new Error(ERROR.INVALID_PARAMS));
                    }

                    UserModel.lockAndGet(club.creator_id, function(err, club_creator) {
                        if (err || !club_creator) {
                            UserModel.unlock(club.creator_id);
                            return callback(new Error(ERROR.INVALID_PARAMS));
                        }

                        // 更新俱乐部房卡
                        club_creator.club_gems -= conf.needed_gems;

                        UserModel.save(club_creator, function (err, result) {
                            UserModel.unlock(club.creator_id);
                            if (err) {
                                return callback(new Error(ERROR.INVALID_OPERATION));
                            }

                            // 广播通知 - 通知俱乐部房卡
                            Event.emit(CONST.EVENT.CLUB_INFO_CHANGED_TO_CREATOR, {
                                user_id: club.creator_id,
                                data: {
                                    club_id: club.id,
                                    room_id: room.id,
                                    cost: conf.needed_gems,
                                    club_gems: club_creator.club_gems,
                                    reason: CONST.REASON.CLUB_ROOM_CREATED
                                }
                            });

                            // 房间创建成功了
                            createRoomFinished();
                        });
                    });
                });
            }
        });
    };

    /**
     * 用户访问过的房间做下记录
     *
     * @param user_id
     * @param room
     */
    this.setKnownRoom = function(user_id, room) {
        if (! room) {
            return;
        }

        if (this.user_known_rooms[user_id] == null) {
            this.user_known_rooms[user_id] = [];
        }

        var user_known_rooms = this.user_known_rooms[user_id];

        if (user_known_rooms.indexOf(room.id) !== -1) {
            // 已经有记录，不用新增
            return;
        }

        // 这里只记录房间号
        this.user_known_rooms[user_id].push(room.id);
    };

    /**
     * 获取指定俱乐部的所有房间列表
     *
     * @param club_id
     */
    this.lookupClubRooms = function(club_id) {
        var rooms = [];
        for (var room_id in this.game_rooms) {
            var game_room = this.game_rooms[room_id];

            if (game_room.isClubRoom() &&
                game_room.club_id === club_id &&
                game_room.status !== CONST.ROOM_STATUS.FINISHED) {
                rooms.push(game_room.getData());
            }
        }

        // 要向大厅推送
        Event.emit(CONST.EVENT.CLUB_ROOMS_TO_MEMBERS, {
            club_id: club_id,
            data: {
                rooms: rooms
            }
        });
    };

    /**
     * 从历史房间记录删除指定的房间
     *
     * @param user_id: 用户ID
     * @param room_id: 房间ID
     */
    this.removeKnownRoom = function(user_id, room_id) {
        var user_known_rooms = this.user_known_rooms[user_id];

        if (! user_known_rooms) {
            return;
        }

        for (var i = 0; i < user_known_rooms.length; i++) {
            if (user_known_rooms[i] === room_id) {
                break;
            }
        }

        if (i < user_known_rooms.length) {
            // 找到了，就删除
            this.user_known_rooms[user_id].splice(i, 1);
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  用户相关
    //
    //  playerDisconnected:             用户离线
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 用户离线
     *
     * @param user_id: 用户ID
     * @returns {boolean}
     */
    this.playerDisconnected = function(user_id) {
        // 从用户玩过的房间记录中查找
        var known_rooms = this.user_known_rooms[user_id];

        if (! known_rooms || known_rooms.length === 0) {
            return false;
        }

        for (var i = 0; i < known_rooms.length; i++) {
            var room_id = known_rooms[i];
            var game_room = this.getGameRoom(room_id);

            if (! game_room) {
                continue;
            }

            // 逐个处理
            game_room.playerDisconnected(user_id);
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  比赛场相关
    //
    //  startMatch:                         开始比赛
    //  createMatchField:                   创建指定时间的比赛场
    //  getMatchFieldByID:                  获取指定ID的比赛场
    //  sitMatchRoom:                       坐下比赛场房间
    //  quitMatchField:                     退出比赛场
    //  readyInMatchField:
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 开始比赛
     *
     */
    this.startMatch = function(type) {
        var self = this;
        var hour = new Date().getHours();

        SettingModel.getSettings(function(err, settings) {
            if (err || !settings) {
                return;
            }

            if (type === CONST.MATCH_TYPE.DAY) {
                // -- 日赛 --
                // 测试
                // hour = 10;
                // 检查开赛时间(例如, 上午10点到下午10点)
                if (hour < settings.day_match_begin_at_hour || hour > settings.day_match_end_at_hour) {
                    return;
                }
            }

            // 获取当前时间秒
            var now_in_second = Date.now() / 1000;
            var start_hour_in_second = Math.floor(now_in_second / 3600) * 3600;

            // 1. 查询参赛人员
            var condition = [];
            // condition.push(['type', type]);
            condition.push(['match_start_timestamp', start_hour_in_second]);
            condition.push(['status', MatchEntryFormModel.STATUS.WAITING]);
            MatchEntryFormModel.getByFields(condition, function(err, result) {
                if (err) {
                    return;
                }

                // 2. 要考虑周赛, 日赛两个都报名的情况, 优先参加周赛, 删除将日赛报名记录改为 [REJECTED]
                var i;
                for (i = 0; i < result.length - 1; i++) {
                    for (var j = i + 1; j < result.length; j++) {
                        if (result[i].user_id === result[j].user_id) {
                            var record;

                            if (result[i].type === CONST.MATCH_TYPE.DAY) {
                                record = result[i];
                            } else if (result[j].type === CONST.MATCH_TYPE.DAY) {
                                record = result[j];
                            }

                            // 不能参加日赛
                            record.status = MatchEntryFormModel.STATUS.REJECTED;
                        }
                    }
                }

                // 3. 过滤已经在其他房间玩的玩家
                var candidates = [];
                for (i = 0; i < result.length; i++) {
                    var entry_form = result[i];

                    if (self.getGameRoomOfPlayer(entry_form.user_id)) {
                        // 通知玩家
                        Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                            user_id: entry_form.user_id,
                            data: {
                                match_start_time: entry_form.match_start_time,
                                start_hour_in_24: hour,
                                type: entry_form.type,
                                reason: CONST.REASON.MATCH_CANCELLED_ALREADY_IN_OTHER_ROOM
                            }
                        });
                    } else {
                        // 可以参赛(被[拒绝]的不能参赛)
                        if (entry_form.status === MatchEntryFormModel.STATUS.WAITING && entry_form.type === type) {
                            candidates.push(result[i]);
                        }
                    }

                    var status;
                    if (entry_form.status === MatchEntryFormModel.STATUS.WAITING) {
                        status = MatchEntryFormModel.STATUS.CHECKED;
                    } else if (entry_form.status === MatchEntryFormModel.STATUS.REJECTED) {
                        status = MatchEntryFormModel.STATUS.REJECTED;
                    }
                    // 更新状态
                    MatchEntryFormModel.save({
                        id: result[i].id,
                        status: status
                    });
                }

                // 4. 人数是否够
                if (candidates.length === 0) {
                    return;
                }

                // 5. 创建比赛场
                self.createMatchField(type, hour, function (err, match_field) {
                    if (err) {
                        console.log('创建比赛场失败', err);
                        return;
                    }

                    // 6. 进入比赛场
                    if (match_field) {
                        match_field.open(candidates, settings);
                    }
                });
            });
        });
    };

    /**
     * 创建指定时间的比赛场
     *
     * @param type
     * @param start_hour_in_24
     * @param callback
     */
    this.createMatchField = function(type, start_hour_in_24, callback) {
        var self = this;

        MatchFieldModel.createMatchField({
            type: type,
            start_hour_in_24: start_hour_in_24
        }, self.server_id, function(err, match_field) {
            if (err) {
                return callback(err);
            }

            match_field = new MatchField(self, match_field);
            self.match_fields[match_field.id] = match_field;

            return callback(null, match_field);
        });
    };

    /**
     * 获取指定ID的比赛场
     *
     * @param match_field_id
     */
    this.getMatchFieldByID = function(match_field_id) {
        var match_field = this.match_fields[match_field_id];

        if (match_field) {
            return match_field;
        }

        return null;
    };

    /**
     * 坐下比赛场房间
     *
     * @param user_id
     * @param connector_id
     * @param match_field_id
     * @param room_id
     */
    this.sitMatchRoom = function(user_id, connector_id, match_field_id, room_id) {
        // 查找比赛场
        var match_field = this.getMatchFieldByID(match_field_id);

        if (! match_field) {
            return;
        }

        match_field.sitRoom(user_id, connector_id, room_id);
    };

    /**
     * 退出比赛场
     *
     * @param user_id
     * @param connector_id
     * @param match_field_id
     * @param callback
     */
    this.quitMatchField = function(user_id, connector_id, match_field_id, callback) {
        // 查找比赛场
        var match_field = this.getMatchFieldByID(match_field_id);

        if (! match_field) {
            return callback(ERROR.INVALID_MATCH_FIELD_ID);
        }

        match_field.userQuitMatch(user_id, connector_id, callback);
    };

    /**
     * 比赛场准备就绪
     *
     * @param user_id
     * @param connector_id
     * @param match_field_id
     * @param callback
     */
    this.readyInMatchField = function(user_id, connector_id, match_field_id, callback) {
        // 查找比赛场
        var match_field = this.getMatchFieldByID(match_field_id);

        if (! match_field) {
            return callback(ERROR.INVALID_MATCH_FIELD_ID);
        }

        match_field.userReady(user_id, connector_id, callback);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  任务相关
    //
    //  update:                             定期执行everyTick
    //  everyTick:                          每隔一段时间执行一次
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 每隔一段时间执行一次
     *
     */
    this.update = function() {
        var now = Date.now();
        this.everyTick(now - this.time);
        this.time = now;

        setTimeout(this.update.bind(this), 100);
    };

    /**
     * 每隔一段时间执行一次
     *      1. 回收已结束的游戏房间
     *      2. 自动解散超时的游戏房间
     *      3. 比赛场定期执行逻辑(比赛场房间由比赛场来回收)
     *
     * @param dt
     */
    this.everyTick = function(dt) {
        // 删除已经结束的游戏房间
        var zombie_rooms = [];
        var room_id;
        for (room_id in this.game_rooms) {
            try {
                var game_room = this.game_rooms[room_id];

                // console.log('当前开的房间: ', room_id, game_room.type);

                if (game_room.status === CONST.ROOM_STATUS.FINISHED) {
                    zombie_rooms.push(room_id);
                } else if (game_room.status === CONST.ROOM_STATUS.WAITING) {
                    // 房间创建30分钟未开始，则自动解散
                    if (game_room.isIdle()) {
                        game_room.dissolveRoom(game_room.creator, true);
                    } else {
                        game_room.update(dt);
                    }
                } else {
                    game_room.update(dt);
                }
            } catch (e) {
                console.error('Error at everySecond:' + e.stack);
            }
        }
        for (var i = 0; i < zombie_rooms.length; i++) {
            room_id = zombie_rooms[i];

            console.log('game_engine 房间【', room_id , '】结束, 要删除~');

            delete this.game_rooms[room_id];

            // 删除已访问过的房间记录
            for (var user_id in this.user_known_rooms) {
                this.removeKnownRoom(user_id, room_id);
            }
        }

        // 删除已经结束的比赛场, 还没结束的执行比赛场逻辑
        for (var match_field_id in this.match_fields) {
            if (! this.match_fields.hasOwnProperty(match_field_id)) {
                continue;
            }
            var match_field = this.match_fields[match_field_id];

            if (match_field.status === CONST.MATCH_FIELD_STATUS.FINISHED) {
                console.log('比赛场' + (match_field.id) + '结束, 要删除~');
                delete this.match_fields[match_field_id];
            } else {
                match_field.update(dt);
            }
        }
    };
};

module.exports = new GameEngine();