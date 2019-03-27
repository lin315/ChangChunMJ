/**
 * Created by leo on 3/23/2018.
 */
var Event = module_manager.getModule(CONST.MODULE.EVENT);

function GameModule() {
    this.CONSTANT = {
        ROUND_COUNT: {
            FOUR: 4,
            EIGHT: 8,
            SIXTEEN: 16,
            TWENTY_FOUR: 24,
            THIRTY_TWO: 32
        },

        FEE_METHOD: {
            CREATOR: 'creator',             // 房主支付
            AA: 'AA'                        // AA制
        }
    };

    // 操作类型
    this.ACTION = {
        READY: 'ready',
        CHU_PAI: 'chu_pai',
        GUO: 'guo',
        SET_MANAGE: 'set_manage'
    };

    // 最多玩家数
    this.max_player_count = 4;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  房间相关
//
//  initRoom:               初始化房间
//
//  canCreateRoom:          检查是否可以创建房间
//  canSitRoom:             检查是否可以加入房间（坐下）
//
//  getRoomData:            获取游戏房间信息
//
//  getMaxPlayerCount:      获取最大玩家数
//
//  isCreatorPayMethod:     是否房主支付创建模式
//  isAAPayMethod:          是否AA支付
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 初始化房间
 *
 * @param room
 */
GameModule.prototype.initRoom = function(room) {
    room.game_status = CONST.GAME_STATUS.WAITING;
};

/**
 * 检查是否可以创建房间
 *
 * @param user  用户信息
 * @param conf
 *      type    房间类型(private/club)
 *      settings    创建选项
 *      club_id(optional)   俱乐部ID
 * @param callback
 * @returns {*}
 */
GameModule.prototype.canCreateRoom = function(user, conf, callback) {
    var self = this;

    var type = conf.type;
    var settings = conf.settings;

    // 1. 房间类型检查
    if (type !== CONST.ROOM_TYPE.PRIVATE &&
        type !== CONST.ROOM_TYPE.CLUB) {
        return callback(ERROR.INVALID_PARAMS);
    }

    if (! settings) {
        return callback(ERROR.INVALID_PARAMS);
    }

    var round_count = settings.round_count;                 //  局数
    var fee_method = settings.fee_method;                   //  房费

    // 2. 局数检查
    /*if (round_count !== this.CONSTANT.ROUND_COUNT.FOUR &&
        round_count !== this.CONSTANT.ROUND_COUNT.EIGHT &&
        round_count !== this.CONSTANT.ROUND_COUNT.SIXTEEN &&
        round_count !== this.CONSTANT.ROUND_COUNT.TWENTY_FOUR) {
        return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
    }*/

    // 3. 房费
    if (fee_method !== this.CONSTANT.FEE_METHOD.CREATOR &&
        fee_method !== this.CONSTANT.FEE_METHOD.AA) {
        return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
    }

    return callback(null);
};

/**
 * 检查是否可以加入房间（坐下）
 *
 * @param user 用户信息
 * @param room 房间信息
 * @param seat_index 指定位置(如果不指定，则随机入座）
 * @param callback
 */
GameModule.prototype.canSitRoom = function(user, room, seat_index, callback) {
    var player;
    // 1. 如果玩家之前在房间
    player = room.getPlayer(user.id);
    if (player) {
        return callback(0, player.index);
    }

    var doTakeSeat = function() {
        var player;
        // 3. 检查指定位置是否玩家(玩家不在房间）
        if (seat_index >= 0 && seat_index < room.max_player_count) {
            // 3.1 玩家指定位置坐下
            player = room.players[seat_index];
            if (player && player.id !== user.id) {
                return callback(ERROR.SIT_ALREADY_TAKEN);
            }

            return callback(0, seat_index);
        } else {
            // 3.2 玩家随便坐下
            for (var i = 0; i < room.max_player_count; i++) {
                player = room.players[i];

                // 记下第一个空位
                if (! player) {
                    return callback(0, i);
                }
            }

            return callback(ERROR.ROOM_IS_FULL);
        }
    };

    // 2. 私人房间: 检查房费, 俱乐部: 检查是否俱乐部成员
    if (room.isPrivateRoom()) {
        var fee = 0;
        if (user.id === room.creator) {
            // 房主已经付了钻石
            fee = 0;
        } else {
            if (room.settings.fee_method === this.CONSTANT.FEE_METHOD.AA) {
                fee = room.needed_gems / room.max_player_count;
            }
        }
        if (user.gems < fee) {
            return callback(ERROR.NOT_ENOUGH_GEMS);
        }

        // 找个位置坐下
        doTakeSeat();
    } else if (room.isClubRoom()) {
        ClubMemberModel.isMemberOfClub(user.id, room.club_id, function(err, count) {
            if (err) {
                return callback(ERROR.INVALID_OPERATION);
            }

            if (count === 0) {
                return callback(ERROR.NOT_CLUB_MEMBER);
            }

            // 是俱乐部成员, 可以坐下
            doTakeSeat();
        })
    } else {
        return callback(ERROR.INVALID_PARAMS);
    }


};

/**
 * 获取游戏房间信息
 *
 * @param room 房间信息
 */
GameModule.prototype.getRoomData = function(room) {
    return room.getData();
};

/**
 * 获取最大玩家数
 *
 * @returns {number}
 */
GameModule.prototype.getMaxPlayerCount = function() {
    return this.max_player_count;
};

/**
 * 是否房主支付
 *
 * @param settings
 * @returns {boolean}
 */
GameModule.prototype.isCreatorPayMethod = function(settings) {
    return (settings && settings.fee_method === this.CONSTANT.FEE_METHOD.CREATOR);
};

/**
 * 是否AA支付
 *
 * @param settings: 房间创建选项
 * @returns {boolean}
 */
GameModule.prototype.isAAPayMethod = function(settings) {
    return (settings && settings.fee_method === this.CONSTANT.FEE_METHOD.AA);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家信息相关
//
//  initPlayer:             初始化玩家信息（玩家进入房间时）
//  resetPlayer:            初始化玩家信息（每局开始前的初始化）
//
//  getPlayerData:          获取玩家的公共信息（供给前端用）
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 初始化玩家信息（玩家进入房间时）
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
GameModule.prototype.initPlayer = function(room, player) {
    this.resetPlayer(room, player);
};

/**
 * 初始化玩家信息（每局开始前的初始化）
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
GameModule.prototype.resetPlayer = function(room, player) {
    player.is_managed = player.is_robot;
};

/**
 * 获取玩家的公共信息（供给前端用）
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
GameModule.prototype.getPlayerData = function(room, player) {
    return room.getPlayerData(player);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏相关
//
//  doRoundStart:                       回合开始
//  prepareRoundStart:                  子游戏回合开始初始化
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 回合开始
 *
 * @param room
 */
GameModule.prototype.doRoundStart = function(room) {
    // 决定下一把庄家
    if (room.next_button === -1) {
        room.next_button = 0;
    }

    room.status = CONST.ROOM_STATUS.PLAYING;
    room.game_status = CONST.GAME_STATUS.STARTED;

    room.round_no ++;
    room.button = room.next_button;
    room.turn = -1;
    room.action_list = [];
    room.round_info = {};
    room.round_result = [];
    room.round_over_time = 0;

    // 子游戏回合开始初始化
    this.prepareRoundStart(room);

    // 保存房间信息
    room.saveModel();

    // 初始化玩家信息
    for (var i = 0; i < room.players.length; i++) {
        this.resetPlayer(room, room.players[i]);
    }

    if (room.round_no === 1) {
        // 游戏第一回合开始
        room.pushMessage(CONST.PUSH.GAME_START_PUSH);

        if (room.isClubRoom()) {
            // 俱乐部房间, 需要广播给所有成员
            Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                club_id: room.club_id,
                data: {
                    room: room.getData(),
                    reason: CONST.REASON.CLUB_ROOM_GAME_STARTED
                }
            });
        }
    }

    // 新的一回合开始
    room.pushMessage(CONST.PUSH.ROUND_START_PUSH, {
        round_no: room.round_no
    });

    // 推送庄家
    room.pushMessage(CONST.PUSH.GAME_BUTTON_PUSH, {
        button: room.button
    });
};

/**
 * 子游戏回合开始初始化
 *
 * @param room
 */
GameModule.prototype.prepareRoundStart = function(room) {
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家操作相关
//
//  doAction:                           玩家操作
//
//
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/**
 * 玩家操作
 *
 * @param room
 * @param player
 * @param action
 */
GameModule.prototype.doAction = function(room, player, action) {
    switch (action.type) {
        case this.ACTION.READY:
            this.doReady(room, player);
            break;

        case this.ACTION.GUO:
            this.doGuo(room, player);
            break;

        case this.ACTION.SET_MANAGE:
            this.doSetManage(room, player, action.state);
            break;
    }
};

/**
 * 准备
 *
 * @param room
 * @param player
 */
GameModule.prototype.doReady = function(room, player) {
    if (player.is_ready === true) {
        return;
    }

    if (room.game_status !== CONST.GAME_STATUS.WAITING) {
        return;
    }

    player.is_ready = true;

    // 通知其他玩家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.READY
    });

    // 人数够, 就进入游戏
    var self = this;

    room.waiting_action = {
        timeout: true,
        remain_time: this.SPAN.READY_TO_START,
        handler: function() {
            // 所有人到齐了，并且都准备好了，则开始新的一局
            for (var i = 0; i < room.max_player_count; i++) {
                player = room.players[i];
                if (! player || player.is_ready === false) {
                    return;
                }
            }

            self.doRoundStart(room);
        }
    };
};

/**
 * 不出
 *
 * @param room
 * @param player
 */
GameModule.prototype.doGuo = function(room, player) {
};

/**
 * 请求托管
 *
 * @param room
 * @param player
 * @param state
 */
GameModule.prototype.doSetManage = function(room, player, state) {
    player.is_managed = state;

    // 通知其他玩家
    room.pushMessage(CONST.PUSH.PLAYER_MANAGED_PUSH, {
        player_index: player.index,
        state: state
    });

    // 如果是取消托管, 直接返回
    if (state === false) {
        return;
    }

    // 托管操作
    this.doManagedOperation(room, player);
};

/**
 * 托管操作
 *
 * @param room
 * @param player
 */
GameModule.prototype.doManagedOperation = function(room, player) {
};

module.exports = GameModule;