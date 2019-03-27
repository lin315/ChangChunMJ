var Event = module_manager.getModule(CONST.MODULE.EVENT);

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  房间相关
    //
    //  playerLeave:                用户退出房间
    //  dissolveRoom:               房主解散房间
    //  requestDissolve:            用户申请解散房间
    //  acceptDissolve:             同意解散房间
    //  rejectDissolve:             用户拒绝解散房间
    //
    //  kickClubMember:             将指定俱乐部成员踢出房间
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 用户退出房间
     *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param {Function} next
     */
    this.playerLeave = function(msg, session, next) {
        var user_id = session.uid;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (! game_room) {
            return next(null, UTIL.successResult(null));
        }

        //	用户离开房间
        game_room.playerLeave(user_id, function (err) {
            if (err) {
                return next(null, UTIL.failResult(err.message));
            }

            if (game_room.isClubRoom()) {
                // 俱乐部房间, 需要广播给所有成员
                Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                    club_id: game_room.club_id,
                    data: {
                        room: game_room.getData(),
                        reason: CONST.REASON.CLUB_MEMBER_LEFT_ROOM
                    }
                });

                // 俱乐部如果是最后一个玩家退出, 需要删掉房间
                if (game_room.player_count === 0) {
                    // 发送消息
                    Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                        club_id: game_room.club_id,
                        data: {
                            room_id: game_room.id,
                            reason: CONST.REASON.CLUB_ROOM_DELETED
                        }
                    });
                    game_room.finishGame(true);
                }
            }

            return next(null, UTIL.successResult(null));
        });
    };

    /**
     * 玩家被踢出房间
     * @param msg
     * @param session
     * @param next
     * @returns {*}
     */
    this.playerKick = function(msg, session, next) {
        var user_id = msg.player_id;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (! game_room) {
            return next(null, UTIL.successResult(null));
        }

        //	用户离开房间
        game_room.playerLeave(user_id, function (err) {
            if (err) {
                return next(null, UTIL.failResult(err.message));
            }

            if (game_room.isClubRoom()) {
                // 俱乐部房间, 需要广播给所有成员
                Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                    club_id: game_room.club_id,
                    data: {
                        room: game_room.getData(),
                        reason: CONST.REASON.CLUB_MEMBER_LEFT_ROOM
                    }
                });

                // 俱乐部如果是最后一个玩家退出, 需要删掉房间
                if (game_room.player_count === 0) {
                    // 发送消息
                    Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                        club_id: game_room.club_id,
                        data: {
                            room_id: game_room.id,
                            reason: CONST.REASON.CLUB_ROOM_DELETED
                        }
                    });
                    game_room.finishGame(true);
                }
            }

            return next(null, UTIL.successResult(null));
        });
    };

    /**
	 * 房主解散房间
	 *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param next
     */
	this.dissolveRoom = function(msg, session, next) {
		var user_id = session.uid;
		var room_id = msg.room_id;
		var game_engine = this.app.get('game_engine');
		var game_room = game_engine.getGameRoom(room_id);
		if (! game_room) {
			return next(null, UTIL.successResult(null));
		}

		// 房主解散房间
		game_room.dissolveRoom(user_id);
		return next(null, UTIL.successResult(null));
	};

    /**
	 * 用户申请解散房间
	 *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param next
     */
	this.requestDissolve = function(msg, session, next) {
		var user_id = session.uid;
		var room_id = msg.room_id;
		var game_engine = this.app.get('game_engine');
		var game_room = game_engine.getGameRoom(room_id);
		if (! game_room) {
			return next(null, UTIL.successResult(null));
		}

		// 用户申请解散房间
		game_room.requestDissolve(user_id);
		return next(null, UTIL.successResult(null));
	};

    /**
     * 同意解散房间
     *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param {Function} next
     */
	this.acceptDissolve = function(msg, session, next) {
        var user_id = session.uid;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (!game_room) {
            return next(null, UTIL.successResult(null));
        }

        //	用户同意解散房间
        game_room.acceptDissolve(user_id);
        return next(null, UTIL.successResult(null));
	};

    /**
     * 用户拒绝解散房间
     *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param {Function} next
     */
    this.rejectDissolve = function(msg, session, next) {
        var user_id = session.uid;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (!game_room) {
            return next(null, UTIL.successResult(null));
        }

        //	用户申请解散房间
        game_room.rejectDissolve(user_id);
        return next(null, UTIL.successResult(null));
    };

    /**
     * 将指定俱乐部成员踢出房间
     *
     * @param msg
     * @param session
     * @param next
     */
    this.kickClubMember = function(msg ,session, next) {
        var creator_id = session.uid;
        var room_id = msg.room_id;
        var user_id = msg.user_id;

        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (!game_room) {
            return next(null, UTIL.successResult(null));
        }

        if (! game_room.isCreator(creator_id)) {
            return next(null, UTIL.failResult(ERROR.NOT_CLUB_CREATOR));
        }

        if (game_room.hasBegan()) {
            return next(null, UTIL.failResult(ERROR.KICK_WHILE_PLAYING));
        }

        // 踢出用户, 让用户离开房间
        game_room.playerLeave(user_id, function (err) {
            if (err) {
                return next(null, UTIL.failResult(err.message));
            }

            // 发送消息
            Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                club_id: game_room.club_id,
                data: {
                    room: game_room.getData(),
                    kicked_player_id: user_id,
                    reason: CONST.REASON.CLUB_MEMBER_KICKED
                }
            });

            // 俱乐部如果是最后一个玩家退出, 需要删掉房间
            if (game_room.player_count === 0) {
                // 发送消息
                Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                    club_id: game_room.club_id,
                    data: {
                        room_id: game_room.id,
                        reason: CONST.REASON.CLUB_ROOM_DELETED
                    }
                });
                game_room.finishGame(true);
            }

            return next(null, UTIL.successResult(null));
        });
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  聊天相关
    //
    //  sendChat:                   用户发送房间聊天信息
    //  sendQuickChat:              用户发送房间快速聊天信息
    //  sendVoiceMsg:               用户发送房间语音聊天信息
    //  sendEmoji:                  用户发送房间动态表情信息
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 用户发送房间聊天信息
     *
     * @param {Object} msg: 信息
	 * 		room_id - 房间号
	 * 		content - 内容
     * @param {Object} session: 用户Session
     * @param {Function} next
     */
    this.sendChat = function(msg, session, next) {
        var user_id = session.uid;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (! game_room) {
            return next(null, UTIL.successResult(null));
        }

        // 用户进行游戏操作
        msg.content = UTIL.filter_words(msg.content);
        game_room.sendChat(user_id, msg);
        return next(null, UTIL.successResult(null));
    };

    /**
     * 用户发送房间快速聊天信息
     *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param {Function} next
     */
    this.sendQuickChat = function(msg, session, next) {
        var user_id = session.uid;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (! game_room) {
            return next(null, UTIL.successResult(null));
        }

        // 用户进行游戏操作
        game_room.sendQuickChat(user_id, msg);
        return next(null, UTIL.successResult(null));
    };

    /**
     * 用户发送房间语音聊天信息
     *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param {Function} next
     */
    this.sendVoiceMsg = function(msg, session, next) {
        var user_id = session.uid;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (! game_room) {
            return next(null, UTIL.successResult(null));
        }

        // 用户进行游戏操作
        game_room.sendVoiceMsg(user_id, msg);
        return next(null, UTIL.successResult(null));
    };

    /**
     * 用户发送房间动态表情信息
	 *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param {Function} next
     */
    this.sendEmoji = function(msg, session, next) {
        var user_id = session.uid;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (! game_room) {
            return next(null, UTIL.successResult(null));
        }

        // 用户进行游戏操作
        game_room.sendEmoji(user_id, msg);
        return next(null, UTIL.successResult(null));
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  其他
    //
    //  doAction:                   用户的游戏操作
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 用户进行游戏操作
     *
     * @param {Object} msg: 信息
     * @param {Object} session: 用户Session
     * @param {Function} next
     */
    this.doAction = function(msg, session, next) {
        var user_id = session.uid;
        var room_id = msg.room_id;
        var game_engine = this.app.get('game_engine');
        var game_room = game_engine.getGameRoom(room_id);
        if (! game_room) {
            return next(null, UTIL.successResult(null));
        }

        // 用户进行游戏操作
        game_room.doAction(user_id, msg);
        return next(null, UTIL.successResult(null));
    };
};