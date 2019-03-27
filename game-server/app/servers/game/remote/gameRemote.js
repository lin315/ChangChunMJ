var Event = module_manager.getModule(CONST.MODULE.EVENT);

module.exports = function(app) {
	return new GameRemote(app);
};

var GameRemote = function(app) {
    this.app = app;
    this.channel_service = app.get('channelService');

    /**
     * 创建游戏房间
     *
     * @param uid: 用户ID
     * @param sid: connectorID
     * @param conf: 房间创建参数
     *        game_id -  游戏ID（类型，例如：yuncheng)
     *        type - 房间类型(private/club)
     *        club_id(optional) - 俱乐部ID
     *        settings - 创建选项
     * @param callback
     */
    this.createGameRoom = function (uid, sid, conf, callback) {
        if (! conf || ! conf.game_id) {
            return callback(UTIL.failResult(ERROR.INVALID_CREATE_ROOM_SETTINGS));
        }

        var game_engine = this.app.get('game_engine');
        var game_id = conf.game_id;
        if (!game_engine || ! game_engine.isGameRunning(game_id)) {
            console.error('未找到游戏逻辑:', game_id);
            return callback(UTIL.failResult(ERROR.GAME_MODULE_NOT_FOUND));
        }
        var game_module = game_engine.getGameModule(game_id);

                                                                                                                        // 1. 获取用户信息
        UserModel.getByID(uid, function (err, user) {
            if (err || ! user) {
                return callback(UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            // 2. 用户是否可以创建房间
            game_module.canCreateRoom(user, conf, function (err, result) {
                if (err) {
                    return callback(UTIL.failResult(err));
                }
                                                                                                                        // 追加创建者选项
                if (conf.type === CONST.ROOM_TYPE.PRIVATE) {
                    conf.creator = user.id;
                } else if (conf.type === CONST.ROOM_TYPE.CLUB) {
                    conf.creator = result.club_creator_id;
                }
                conf.needed_gems = result.needed_gems;

                                                                                                                        // 可以创建房间
                game_engine.createGameRoom(conf, function (err, game_room) {
                    if (err) {
                        console.error('创建游戏房间失败', err.stack);
                        return callback(UTIL.failResult(err.message));
                    }

                    if (conf.type === CONST.ROOM_TYPE.CLUB) {
                                                                                                                        // 新建的俱乐部房间, 需要广播给所有成员
                        Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                            club_id: game_room.club_id,
                            data: {
                                room: game_room.getData(),
                                reason: CONST.REASON.CLUB_ROOM_CREATED
                            }
                        });
                    }

                    return callback(UTIL.successResult(game_room.id));
                });
            });
        });
    };

    /**
     * 加入游戏房间（旁观）
     *
     * @param uid: 用户ID
     * @param sid: connectorID
     * @param conf: 加入选项
     *        room_id - 房间号
     * @param callback
     */
    this.enterGameRoom = function (uid, sid, conf, callback) {
        if (! conf || ! conf.room_id) {
            return callback(UTIL.failResult(ERROR.INVALID_JOIN_ROOM_SETTINGS));
        }

        var game_engine = this.app.get('game_engine');
        var room_id = conf.room_id;
        var game_room = game_engine.getGameRoom(room_id);
        if (!game_room) {
            // 如果游戏房间不存在, 清除用户的房间信息
            UserModel.clearRoomID(uid, false);
            return callback(UTIL.failResult(ERROR.INVALID_ROOM_ID));
        }

        // 获取用户信息
        UserModel.getByID(uid, function (err, user) {
            if (err || ! user) {
                return callback(UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            // 直接进入, 不需要有效性检查
            game_room.playerEnter(user, sid, function (err) {
                if (err) {
                    return callback(UTIL.failResult(err.message));
                }

                // 记录用户的访问历史
                game_engine.setKnownRoom(user.id, game_room);

                return callback(UTIL.successResult({
                    room_id: game_room.id
                }));
            });
        });
    };

    /**
     * 加入游戏房间（坐下）
     *
     * @param uid: 用户ID
     * @param sid: connectorID
     * @param conf: 加入选项
     *        room_id - 房间号
     *        seat_index - 座位Index
     * @param callback
     */
    this.sitGameRoom = function (uid, sid, conf, callback) {
        if (! conf || ! conf.room_id) {
            return callback(UTIL.failResult(ERROR.INVALID_JOIN_ROOM_SETTINGS));
        }

        var game_engine = this.app.get('game_engine');
        var room_id = conf.room_id;
        var seat_index = conf.seat_index;
        var game_room = game_engine.getGameRoom(room_id);
        if (! game_room) {
            // 如果游戏房间不存在, 清除用户的房间信息
            UserModel.clearRoomID(uid, false);
            return callback(UTIL.failResult(ERROR.INVALID_ROOM_ID));
        }

        // 获取用户信息
        UserModel.getByID(uid, function (err, user) {
            if (err || ! user) {
                return callback(UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            // 检查用户是否可以加入房间
            var game_module = game_room.game_module;
            game_module.canSitRoom(user, game_room, seat_index, function (err, result) {
                if (err) {
                    return callback(UTIL.failResult(err));
                }

                // 可以加入房间
                seat_index = result;
                game_room.playerSit(user, sid, seat_index, function (err, result) {
                    if (err) {
                        return callback(UTIL.failResult(err.message));
                    }
                    // 记录用户的访问历史
                    game_engine.setKnownRoom(user.id, game_room);

                    if (game_room.isClubRoom()) {
                        // 俱乐部房间, 需要广播给所有成员
                        Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                            club_id: game_room.club_id,
                            data: {
                                room: game_room.getData(),
                                reason: CONST.REASON.CLUB_MEMBER_SIT_ROOM
                            }
                        });
                    }

                    // 加入房间成功
                    return callback(UTIL.successResult({
                        room_id: game_room.id,
                        seat_index: result
                    }));
                });
            });
        });
    };

    /**
     * 获取指定俱乐部的桌子列表
     *
     * @param uid:  用户ID
     * @param sid:  connectorID
     * @param conf
     * @param callback
     */
    this.lookupClubRooms = function(uid, sid, conf, callback) {
        var game_engine = this.app.get('game_engine');

        if (! game_engine) {
            return callback(UTIL.failResult(ERROR.GAME_MODULE_NOT_FOUND));
        }

        var club_id = conf.club_id;

        game_engine.lookupClubRooms(club_id);

        return callback(UTIL.successResult(null));
    };

    /**
     * 创建比赛场
     *
     * @param type: 比赛类型（日赛/周赛）
     * @param callback
     * @returns {*}
     */
    this.startMatch = function(type, callback) {
        var game_engine = this.app.get('game_engine');

        game_engine.startMatch(type);

        return callback(UTIL.successResult(null));
    };

    /**
     * 进入比赛场房间
     *
     * @param uid
     * @param sid
     * @param conf
     *      match_field_id  比赛场ID
     *      room_id 房间ID
     * @param callback
     */
    this.sitMatchRoom = function(uid, sid, conf, callback) {
        var game_engine = this.app.get('game_engine');
        var match_field_id = conf.match_field_id;
        var room_id = conf.room_id;

        game_engine.sitMatchRoom(uid, sid, match_field_id, room_id);

        return callback(UTIL.successResult(null));
    };

    /**
     * 退出比赛场
     *
     * @param uid
     * @param sid
     * @param conf
     * @param callback
     */
    this.quitMatchField = function(uid, sid, conf, callback) {
        var game_engine = this.app.get('game_engine');
        var match_field_id = conf.match_field_id;

        game_engine.quitMatchField(uid, sid, match_field_id, callback);
    };

    /**
     * 比赛场准备就绪
     *
     * @param uid
     * @param sid
     * @param conf
     * @param callback
     */
    this.readyInMatchField = function(uid, sid, conf, callback) {
        var game_engine = this.app.get('game_engine');
        var match_field_id = conf.match_field_id;

        game_engine.readyInMatchField(uid, sid, match_field_id, callback);
    };

    /**
     * 用户离开
     *
     * @param uid: 用户ID
     * @param sid: connectorID
     * @param callback
     */
    this.userDisconnected = function (uid, sid, callback) {
        var self = this;
        UserModel.getByID(uid, function (err, user) {
            if (err || ! user) {
                return callback(UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            // 获取游戏房间
            var game_engine = self.app.get('game_engine');
            var room_id = user.room_id;
            var match_field_id = user.match_field_id;

            if (match_field_id !== '') {
                // 在比赛场
                var match_field = game_engine.getMatchFieldByID(match_field_id);
                if (! match_field) {
                    UserModel.clearRoomID(user.id, true);
                    return callback(UTIL.failResult(ERROR.INVALID_MATCH_FIELD_ID));
                }
                match_field.playerDisconnected(uid);
            } else {
                // 其他房间(好友/俱乐部)
                var game_room = game_engine.getGameRoom(room_id);
                if (!game_room && room_id) {
                    // 找不到用户正在玩的房间
                    UserModel.clearRoomID(user.id, false);
                    return callback(UTIL.failResult(ERROR.INVALID_ROOM_ID));
                }

                // 玩家离线处理(要考虑旁观的情况)
                game_engine.playerDisconnected(uid);

                if (game_room && game_room.isClubRoom()) {
                    // 通知在线/离线情况
                    Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                        club_id: game_room.club_id,
                        data: {
                            room: game_room.getData(),
                            reason: CONST.REASON.CLUB_MEMBER_DISCONNECTED
                        }
                    });
                }
            }

            return callback(UTIL.successResult(null));
        });
    };
};