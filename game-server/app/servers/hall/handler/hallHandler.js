var Event = module_manager.getModule(CONST.MODULE.EVENT);

var hall_engine = require('../logic/hall_engine');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
    this.app = app;

    /**
     * 创建房间
     *
     * @param msg: 创建房间选项
     * @param session: 用户Session
     * @param callback
     */
    this.createRoom = function (msg, session, callback) {
        var targetServer = hall_engine.getGameServer();

        if (!targetServer) {
            return callback(ERROR.FAIL_TO_CONNECT_GAME_SERVER);
        }

        var self = this;

        UserModel.getByID(session.uid, function(err, user) {
            if (err || ! user) {
                return callback(ERROR.MODEL_NOT_FOUND);
            }

            // 被查封的账号不能创建房间
            if (user.is_blocked) {
                return callback(ERROR.USER_BLOCKED);
            }

            session.set('game_server_id', targetServer.id);
            session.push('game_server_id', function (err) {
                if (err) {
                    console.error('在Session设置游戏服务器ID失败', err.stack);
                    return callback(ERROR.SESSION_BIND_FAILED);
                }

                self.app.rpc.game.gameRemote.createGameRoom(session, session.uid, session.frontendId, msg, function (result) {
                    return callback(null, result);
                });
            });
        });
    };

    /**
     * 创建私人房间
     *
     * @param msg: 创建房间选项
     * @param session: 用户Session
     * @param next
     */
    this.createPrivateRoom = function (msg, session, next) {
        var self = this;
        this.createRoom(msg, session, function(err, result) {
            if (err) {
                return next(null, UTIL.failResult(err));
            }

            if (result.code === 0) {
                // 创建成功, 直接坐下
                self.app.rpc.game.gameRemote.sitGameRoom(session, session.uid, session.frontendId, {room_id: result.data}, function (result) {
                    return next(null, result);
                });
            } else {
                return next(null, result);
            }
        });
    };

    /**
     *  加入房间（旁观）
     *
     * @param msg
     * @param session
     * @param next
     */
    this.enterRoom = function(msg, session, next) {
        var room_id = msg.room_id;
        var user_id = session.uid;

        var self = this;

        UserModel.getByID(user_id, function (err, user) {
            if (err || ! user) {
                return next(null, UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            if (user.room_id && user.room_id !== room_id) {
                return next(null, UTIL.failResult(ERROR.ALREADY_IN_ROOM));
            }

            RoomModel.getByID(room_id, function (err, room) {
                if (err) {
                    return next(null, UTIL.failResult(ERROR.INVALID_OPERATION));
                }

                // 房间不存在, 清除用户的房间信息
                if (! room) {
                    UserModel.clearRoomID(user.id, false);
                    return next(null, UTIL.failResult(ERROR.INVALID_ROOM_ID));
                }

                session.set('game_server_id', room.server_id);
                session.push('game_server_id', function (err) {
                    if (err) {
                        console.error('在Session设置游戏服务器ID失败', err.stack);
                        return next(null, UTIL.failResult(ERROR.SESSION_BIND_FAILED));
                    }

                    //  在游戏服务器上进入房间（旁观）
                    self.app.rpc.game.gameRemote.enterGameRoom(session, user_id, session.frontendId, msg, function (result) {
                        return next(null, result);
                    });
                });
            });
        });
    };

    /**
     * 加入房间（坐下）
     *
     * @param msg: 加入房间参数
     * @param session: 用户Session
     * @param next
     */
    this.sitRoom = function (msg, session, next) {
        var room_id = msg.room_id;
        var user_id = session.uid;

        var self = this;

        UserModel.getByID(user_id, function (err, user) {
            if (err || ! user) {
                return next(null, UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            if (user.room_id && user.room_id !== room_id) {
                return next(null, UTIL.failResult(ERROR.ALREADY_IN_ROOM));
            }

            // 被查封的账号不能坐下房间
            if (user.is_blocked) {
                return next(null, UTIL.failResult(ERROR.USER_BLOCKED));
            }

            RoomModel.getByID(room_id, function (err, room) {
                if (err) {
                    return next(null, UTIL.failResult(ERROR.INVALID_OPERATION));
                }

                // 房间不存在, 清除用户的房间信息
                if (! room) {
                    UserModel.clearRoomID(user.id, false);
                    return next(null, UTIL.failResult(ERROR.INVALID_ROOM_ID));
                }

                session.set('game_server_id', room.server_id);
                session.push('game_server_id', function (err) {
                    if (err) {
                        console.error('在Session设置游戏服务器ID失败', err.stack);
                        return next(null, UTIL.failResult(ERROR.SESSION_BIND_FAILED));
                    }

                    //  在游戏服务器上进入房间（坐下）
                    self.app.rpc.game.gameRemote.sitGameRoom(session, user_id, session.frontendId, msg, function (result) {
                        return next(null, result);
                    });
                });
            });
        });
    };

    /**
     * 进入俱乐部房间
     *
     * @param msg
     * @param session
     * @param next
     */
    this.sitClubRoom = function(msg, session, next) {
        var self = this;

        var user_id = session.uid;
        var club_id = msg.club_id;
        var club_room_setting_id = msg.club_room_setting_id;

        var room_id = msg.room_id;
        if(room_id) {
            RoomModel.getByID(room_id, function(err, room) {
                if (err || ! room) {
                    return next(null, UTIL.failResult(ERROR.INVALID_OPERATION));
                }

                var doSitClubRoom = function (room1) {
                    msg.room_id = room1.id;
                    msg.type = CONST.ROOM_TYPE.CLUB;

                    self.sitRoom(msg, session, next);
                };

                var j;
                for (j = 0; j < room.max_player_count; j++) {
                    if (room.players[j] === 0) {
                        // 有空位置
                        break;
                    }
                }
                if (j < room.max_player_count) {
                    // 有空位置, 直接坐下
                    doSitClubRoom(room);
                } else {
                    return next(null, UTIL.failResult(ERROR.ROOM_IS_FULL));
                }
                return;
            });
        } else {

            // 查看是否已经有【俱乐部 + 创建选项】的房间
            RoomModel.getByFields([
                ['club_id', club_id],
                ['club_room_setting_id', club_room_setting_id],
                ['status', '!=', CONST.ROOM_STATUS.FINISHED]
            ], function (err, rooms) {
                if (err || !rooms) {
                    return next(null, UTIL.failResult(ERROR.INVALID_OPERATION));
                }

                // 验证用户是否俱乐部成员
                ClubMemberModel.isMemberOfClub(user_id, club_id, function (err, is_member) {
                    if (err) {
                        return next(null, UTIL.failResult(ERROR.INVALID_OPERATION));
                    }

                    if (!is_member) {
                        return next(null, UTIL.failResult(ERROR.NOT_CLUB_MEMBER));
                    }

                    // 新建一个俱乐部房间, 并坐下
                    var doCreateAndSitClubRoom = function () {
                        // 获取俱乐部房间选项
                        ClubRoomSettingModel.getByID(club_room_setting_id, function (err, club_room_settings) {
                            if (err || !club_room_settings) {
                                return next(null, UTIL.failResult(ERROR.INVALID_OPERATION));
                            }

                            msg.type = CONST.ROOM_TYPE.CLUB;
                            msg.game_id = club_room_settings.game_id;
                            msg.settings = club_room_settings.settings;

                            self.createRoom(msg, session, function (err, result) {
                                if (err) {
                                    return next(null, UTIL.failResult(err));
                                }

                                if (result.code === 0) {
                                    // 创建成功, 直接坐下
                                    self.app.rpc.game.gameRemote.sitGameRoom(session, session.uid, session.frontendId, {
                                        room_id: result.data,
                                        seat_index: msg.seat_index
                                    }, function (result) {
                                        return next(null, result);
                                    });
                                } else {
                                    return next(null, result);
                                }
                            });
                        });
                    };

                    // 在指定房间坐下
                    var doSitClubRoom = function (room) {
                        msg.room_id = room.id;
                        msg.type = CONST.ROOM_TYPE.CLUB;

                        self.sitRoom(msg, session, next);
                    };

                    if (!rooms.length) {
                        // 没有房间, 需要新建一个
                        doCreateAndSitClubRoom();
                    } else {
                        for (var i = 0; i < rooms.length; i++) {
                            var room = rooms[i];
                            // 查看是否有空位置
                            for (var j = 0; j < room.max_player_count; j++) {
                                if (room.players[j] === 0) {
                                    // 有空位置
                                    break;
                                }
                            }

                            if (j < room.max_player_count) {
                                // 有空位置, 直接坐下
                                doSitClubRoom(room);
                                break;
                            }
                        }

                        if (i === rooms.length) {
                            // 没有空位置, 房间已满
                            return next(null, UTIL.failResult(ERROR.ROOM_IS_FULL));
                        }
                    }
                });
            });
        }
    };

    /**
     * 进入比赛场房间
     *
     * @param msg
     * @param session
     * @param next
     */
    this.sitMatchRoom = function(msg, session, next) {
        var self = this;

        var user_id = session.uid;

        UserModel.getByID(user_id, function (err, user) {
            if (err || !user) {
                return next(null, UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            // 向比赛场注册用户连接
            self.app.rpc.game.gameRemote.sitMatchRoom(session, user_id, session.frontendId, msg, function(result) {
                return next(null, result);
            });
        });
    };

    /**
     * 退出比赛场
     *
     * @param msg
     * @param session
     * @param next
     */
    this.quitMatchField = function(msg, session, next) {
        var self =  this;
        var user_id = session.uid;

        UserModel.getByID(user_id, function (err, user) {
            if (err || !user) {
                return next(null, UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            // 向比赛场注册用户连接
            self.app.rpc.game.gameRemote.quitMatchField(session, user_id, session.frontendId, msg, function(err) {
                if (err) {
                    return next(null, UTIL.failResult(err));
                } else {
                    return next(null, UTIL.successResult(null));
                }
            });
        });
    };

    /**
     * 比赛场准备就绪
     *
     * @param msg
     * @param session
     * @param next
     */
    this.readyInMatchField = function(msg ,session, next) {
        var self =  this;
        var user_id = session.uid;

        UserModel.getByID(user_id, function (err, user) {
            if (err || !user) {
                return next(null, UTIL.failResult(ERROR.MODEL_NOT_FOUND));
            }

            // 向比赛场注册用户连接
            self.app.rpc.game.gameRemote.readyInMatchField(session, user_id, session.frontendId, msg, function(err) {
                if (err) {
                    return next(null, UTIL.failResult(err));
                } else {
                    return next(null, UTIL.successResult(null));
                }
            });
        });
    };

    /**
     * 获取指定俱乐部的桌子列表
     *
     * @param msg
     * @param session
     * @param next
     */
    this.lookupClubRooms = function(msg, session, next) {
        // 尝试从内存读取
        this.app.rpc.game.gameRemote.lookupClubRooms(session, session.uid, session.frontendId, msg, function(result) {
            return next(null, result);
        });
    };
};