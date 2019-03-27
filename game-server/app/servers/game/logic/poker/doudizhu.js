/**
 * Created by leo on 3/16/2018.
 */

var GameModule = require('../game_module');
var Event = module_manager.getModule(CONST.MODULE.EVENT);

var poker_util = require('./poker_util');

function DouDiZhuGameModule() {
    GameModule.call(this);

    // 斗地主操作类型
    this.ACTION.JIAO_PAI = 'jiao_pai';                                                                                  //  叫牌
    this.ACTION.VIEW_PAI = 'view_pai';
    // -- 斗地主CONSTANT --
    // 玩法
    this.CONSTANT.PLAY_METHOD = {
        NORMAL: 'normal',                                                                                               //  普通玩法
        LAIZI: 'laizi'                                                                                                  //  赖子玩法
    };
    // 炸弹算分
    this.CONSTANT.ZHA_DAN = {
        PINGJIA: 'pingjia',                                                                                             //  炸弹平加
        JIABEI: 'jiabei'                                                                                                //  炸弹加倍
    };


    // 等待时间
    this.SPAN = {
        READY_TO_START: 100,
        ZHUA_PAI: 2000,
        NO_LANDLORD_HINT: 500,
        JIAO_PAI: 1000,
        CHOOSE_LAIZI: 2000,
        OPERATION_LIMIT: 15000,
        MANAGE_DELAY: 1000,
        ROUND_OVER_HINT: 2000,
        SHOW_LAST_PAI: 1500,                                                                                            //  最后结束亮牌

        ANIM_CHU_PAI: 250,
        ANIM_GUO: 250
    };

    // 这一轮玩家的操作记录
    this.TURN_RECORD = {
        WAITING: 'waiting',
        CHU_PAI: 'chu_pai',
        GUO: 'guo'
    };
}
DouDiZhuGameModule.prototype = new GameModule();
DouDiZhuGameModule.prototype.constructor = DouDiZhuGameModule;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  房间相关
//
//  canCreateRoom:              检查是否可以创建房间
//
//  initRoom:                   初始化房间
//  getRoomData:                获取房间信息
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 检查是否可以创建房间
 *
 * @param user  用户信息
 * @param conf
 *      type    房间类型(private/club)
 *      club_id 俱乐部ID
 *      settings    创建选项
 *          player_count 玩家数(3/4)
 *          play_method 玩法(普通/赖子)
 *          feng_ding: 炸弹封顶(3/5/7)
 *          zha_dan: 炸弹加分(平加/加倍)
 *
 *          has_no_3_dai_2 不可三带2
 *          has_4_dai_2 可四带2
 *          has_no_two_2 少两个2
 *          has_no_two_3 少两个3
 * @param callback
 */
DouDiZhuGameModule.prototype.canCreateRoom = function(user, conf, callback) {
    var self = this;

    GameModule.prototype.canCreateRoom.call(this, user, conf, function(err) {
        if (err) {
            return callback(err);
        }

        var type = conf.type;
        var settings = conf.settings;

        var fee_method = settings.fee_method;                                                                           //  房费
        var needed_gems;
        var club_creator_id;

        var doCheck = function() {
            var player_count = settings.player_count;
            var play_method = settings.play_method;
            var feng_ding = settings.feng_ding;
            var zha_dan = settings.zha_dan;

            // 1. 玩家数
            if (player_count !== 3 && player_count !== 4) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 2. 玩法
            if (play_method !== self.CONSTANT.PLAY_METHOD.NORMAL &&
                play_method !== self.CONSTANT.PLAY_METHOD.LAIZI) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 3. 炸弹封顶
            if (feng_ding !== 3 && feng_ding !== 5 && feng_ding !== 7) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 4. 炸弹算分
            if (zha_dan !== self.CONSTANT.ZHA_DAN.PINGJIA && zha_dan !== self.CONSTANT.ZHA_DAN.JIABEI) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 5. 4人玩法 + 缺两个2/3
            if (player_count === 4 && (!(settings.has_no_two_2 || settings.has_no_two_3))) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 6. 4人玩法 + 炸弹加分
            if (player_count === 4 && zha_dan !== self.CONSTANT.ZHA_DAN.PINGJIA) {
                // return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 7. 4人玩法 + 普通玩法
            if (player_count === 4 && play_method !== self.CONSTANT.PLAY_METHOD.NORMAL) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            if (club_creator_id !== null) {
                return callback(0, {
                    needed_gems: needed_gems,
                    club_creator_id: club_creator_id
                });
            } else {
                return callback(0, {
                    needed_gems: needed_gems
                });
            }
        };

        // 0. 房费
        if (type === CONST.ROOM_TYPE.PRIVATE) {                                                                         //  私人房间
            if (fee_method === self.CONSTANT.FEE_METHOD.AA) {
                // 每人1个房卡
                needed_gems = 1;
            } else {
                // 房主3/4个房卡
                if (settings.player_count === 3) {
                    needed_gems = 3;
                } else {
                    needed_gems = 4;
                }
            }
            if (user.gems < needed_gems) {
                return callback(ERROR.NOT_ENOUGH_GEMS);
            }

            // 接着检查
            doCheck();
        } else if (type === CONST.ROOM_TYPE.CLUB) {                                                                    //   俱乐部
            // 房主3/4个房卡
            if (settings.player_count === 3) {
                needed_gems = 3;
            } else {
                needed_gems = 4;
            }

            var club_id = conf.club_id;
            ClubModel.getByID(club_id, function(err, club) {
                if (err) {
                    return callback(ERROR.INVALID_PARAMS);
                }

                UserModel.getByID(club.creator_id, function(err, club_creator) {
                    if (err || ! club_creator) {
                        return callback(ERROR.INVALID_PARAMS);
                    }

                    if (club_creator.club_gems < needed_gems) {
                        return callback(ERROR.NOT_ENOUGH_GEMS);
                    }

                    // 更新俱乐部创建者
                    club_creator_id = club_creator.id;

                    // 接着检查
                    doCheck();
                });
            });
        }
    });
};

/**
 * 初始化房间
 *
 * @param room
 */
DouDiZhuGameModule.prototype.initRoom = function(room) {
    GameModule.prototype.initRoom.call(this, room);

    // 斗地主固有属性
    room.pokers = [];
    room.last_chu_pai = {
        index: -1,
        pattern: {
            name: poker_util.PATTERN_NAME.NONE,
            weight: 0,
            length: 0,
            pokers: []
        }
    };
    room.laizi = -1;
    room.bomb_count = 0;
    room.bottom_score = 0;
    room.bottom_pokers = [];
    room.landlord_chu_pai_count = 0;                                                                                    //  地主出牌次数
    room.peasant_chu_pai_count = 0;                                                                                     //  农民出牌次数
    room.max_jiao_pai = 0;                                                                                              //  房间最大叫分
};

/**
 * 获取房间信息
 *
 * @param room
 */
DouDiZhuGameModule.prototype.getRoomData = function(room) {
    var data = GameModule.prototype.getRoomData.call(this, room);

    // 斗地主属性
    data.last_chu_pai = room.last_chu_pai;
    data.laizi = room.laizi;
    data.bomb_count = room.bomb_count;
    data.bottom_score = room.bottom_score;
    data.bottom_pokers = room.bottom_pokers;
    data.max_jiao_pai = room.max_jiao_pai;

    // 回合结算信息
    data.round_result = room.round_result;
    data.round_over_time = room.round_over_time;

    return data;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家信息相关
//
//  initPlayer:                 初始化玩家信息（玩家进入房间时）
//  resetPlayer:                初始化玩家信息（每局开始前的初始化）
//
//  getPlayerData:              获取玩家的公共信息（供给前端用）
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 初始化玩家信息（玩家进入房间时）
 *
 * @param room
 * @param player
 */
DouDiZhuGameModule.prototype.initPlayer = function(room, player) {
    GameModule.prototype.initPlayer.call(this, room, player);

    if (! room.isMatchFieldRoom()) {
        // 统计信息
        player.score = 0;                                                                                               //  玩家总分数
    }

    this.resetPlayer(room, player);
};

/**
 * 初始化玩家信息（每局开始前的初始化）
 *
 * @param room
 * @param player
 */
DouDiZhuGameModule.prototype.resetPlayer = function(room, player) {
    GameModule.prototype.resetPlayer.call(this, room, player);

    player.holds = [];                                                                                                  //  手牌
    player.poker_count = 0;                                                                                             //  剩余牌张
    player.is_landlord = false;                                                                                        //  是否地主
    player.turn_record = this.TURN_RECORD.WAITING;                                                                     //  这一轮玩家的操作记录(过/出/待)
    player.jiao_pai = -1;                                                                                               //  玩家叫牌情况(底分, 叫牌最大的当地主)
    player.is_winner = false;                                                                                          //  是否赢家
    player.hint_candidates = [];                                                                                        //  玩家的提示牌组
};

/**
 * 获取玩家的公共信息（供给前端用）
 *
 * @param room 房间信息
 * @param player 玩家信息
 * @param is_me 是否我的信息
 */
DouDiZhuGameModule.prototype.getPlayerData = function(room, player, is_me) {
    var player_data = GameModule.prototype.getPlayerData.call(this, room, player);

    // 斗地主固有信息
    player_data.poker_count = player.poker_count;                                                                       //  剩余牌张
    player_data.is_landlord = player.is_landlord;                                                                       //  是否地主
    player_data.score = player.score;                                                                                   //  总分
    player_data.bomb_score = player.bomb_score;                                                                         //  炸弹

    player_data.turn_record = player.turn_record;                                                                       //  这一轮操作
    player_data.jiao_pai = player.jiao_pai;                                                                             //  玩家叫的牌

    player_data.is_winner = player.is_winner;                                                                           //  是否赢家

    if (is_me || (room.status === CONST.ROOM_STATUS.PLAYING && room.game_status !== CONST.GAME_STATUS.PLAYING)) {
        // 玩家: 手牌 + 提示牌组
        player_data.holds = player.holds;
        player_data.hint_candidates = player.hint_candidates;
    }

    return player_data;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏相关
//
//  syncGameData:                   同步游戏
//
//  doRoundStart:                   回合开始
//  prepareRoundStart:              回合开始初始化
//
//  startZhuapai:                   开始抓牌
//
//  shuffle:                        洗牌
//  deal:                           发牌
//
//  startJiaoPai:                   叫地主
//  chooseLaizi:                    抽赖子牌
//  startPlay:                      开始游戏
//
//  backupRoundInfo:                备份回合信息
//
//  moveToNextUser:                 移动轮子
//
//  doManagedOperation:             托管操作
//  getAutoChuPais:                 决定自动出的牌组
//
//  clearTurnRecords:               清理轮子记录
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 同步游戏
 *
 * @param room
 * @param user_id
 */
DouDiZhuGameModule.prototype.syncGameData = function(room, user_id) {
    var data = this.getRoomData(room);

    data.players = [];
    for (var i = 0; i < room.players.length; i++) {
        var player = room.players[i];

        if (! player) {
            data.players.push(null);
        } else {
            var player_data = this.getPlayerData(room, player, player.id === user_id);

            data.players.push(player_data);
        }
    }

    // 推送
    room.sendMsg(user_id, CONST.PUSH.GAME_SYNC_PUSH, data);
};

/**
 * 回合开始
 *
 * @param room
 */
DouDiZhuGameModule.prototype.doRoundStart = function(room) {
    GameModule.prototype.doRoundStart.call(this, room);

    // 开始抓牌
    //var player = room.players[5];
    //player.score = 100;
    this.startZhuapai(room);
};

/**
 * 回合开始初始化
 *
 * @param room
 */
DouDiZhuGameModule.prototype.prepareRoundStart = function(room) {
    GameModule.prototype.prepareRoundStart.call(this, room);

    // 斗地主固有属性
    room.pokers = [];
    room.last_chu_pai = {                                                                                               //  这一轮牌桌上已经出的最大牌型以及玩家位置
        index: -1,
        pattern: {
            name: poker_util.PATTERN_NAME.NONE,
            weight: 0,
            length: 0,
            pokers: []
        }
    };
    room.laizi = -1;
    room.bomb_count = 0;
    room.bottom_score = 0;
    room.bottom_pokers = [];
    room.landlord_chu_pai_count = 0;                                                                                    //  地主出牌次数
    room.peasant_chu_pai_count = 0;                                                                                     //  农民出牌次数
    room.max_jiao_pai = 0;
};

    /**
 * 开始抓牌
 *
 * @param room
 */
DouDiZhuGameModule.prototype.startZhuapai = function(room) {
    room.game_status = CONST.GAME_STATUS.ZHUAPAI;

    // 开始发手牌
    room.pushMessage(CONST.PUSH.DEAL_POKER_STARTED);

    // 洗牌
    this.shuffle(room);

    // 发牌
    this.deal(room);

    // 开局时，给每位玩家分别通知手牌
    var players = room.players;
    for (var i = 0; i < room.player_count; i++) {
        var player = players[i];

        // 给当前玩家通知手牌
        room.sendMsg(player.id, CONST.PUSH.PLAYER_HOLDS_PUSH, player.holds);

        // 给其他玩家通知手牌数目
        room.pushMessage(CONST.PUSH.PLAYER_POKER_COUNT_PUSH, {
            player_index: player.index,
            poker_count: player.poker_count
        });
    }

    // 手牌发完了
    room.pushMessage(CONST.PUSH.DEAL_POKER_FINISHED);

    // 时间到自动进入抢地主阶段, 即抓牌动画结束以后
    var self = this;
    room.waiting_action = {
        timeout: true,
        remain_time: this.SPAN.ZHUA_PAI,
        handler: function() {
            self.startJiaoPai(room);
        }
    };
};

/**
 * 洗牌
 *
 * @param room
 */
DouDiZhuGameModule.prototype.shuffle = function(room) {
    // 0 - 12: (Spade)
    // 13 - 25: (Heart)
    // 26 - 38: (Club)
    // 39 - 51: (Diamond)
    // 52: 小王
    // 53: 大王
    var pokers = [];

    for (var poker = 0; poker < 54; poker++) {
        if (room.settings.player_count === 4) {
            if ((room.settings.has_no_two_2 && (poker === 27 || poker === 40)) ||
                (room.settings.has_no_two_3 && (poker === 28 || poker === 41))) {
                // Club, Diamond 2/3
                continue;
            }
        }

        pokers.push(poker);
    }

    room.pokers = UTIL.shuffle(pokers);
};

/**
 * 发牌
 *
 * @param room
 */
DouDiZhuGameModule.prototype.deal = function(room) {
    var hold_count = 17;
    if (room.settings.player_count === 4) {
        hold_count = 12;
    }

    for (var i = 0; i < room.player_count * hold_count; i++) {
        var poker = room.pokers[i];
        var player_index = i % room.player_count;

        while (room.players[player_index].holds.length === hold_count) {
            player_index = (player_index + 1) % room.player_count;
        }

        room.players[player_index].holds.push(poker);
    }

    // this.testDeal(room);

    // 默认排序
    for (i = 0; i < room.player_count; i++) {
        poker_util.sortPokersWithLaizi(room.players[i].holds);
    }

    for (i = 0; i < room.player_count; i++) {
        room.players[i].poker_count = room.players[i].holds.length;
    }
};

DouDiZhuGameModule.prototype.testDeal = function(room) {
    // 3# 双顺测试
    room.players[0].holds = [3, 3, 3, 4, 4, 4, 2, 2];
    room.players[1].holds = [6, 6, 6, 7, 7, 8, 8];
};

/**
 * 叫地主
 *
 * @param room
 */
DouDiZhuGameModule.prototype.startJiaoPai = function(room) {
    room.game_status = CONST.GAME_STATUS.JIAOPAI;

    // 轮到玩家来叫牌
    room.pushMessage(CONST.PUSH.START_JIAO_PAI_PUSH);

    // 从庄家开始叫牌
    this.moveToNextUser(room);
};

/**
 * 抽赖子牌
 *
 * @param room
 */
DouDiZhuGameModule.prototype.chooseLaizi = function(room) {
    // 更新游戏状态
    room.game_status = CONST.GAME_STATUS.READY_TO_PLAY;

    if (room.settings.play_method === this.CONSTANT.PLAY_METHOD.LAIZI && room.settings.player_count === 3) {
        // 赖子玩法, 抽赖子
        room.laizi = UTIL.randomInt(0, 13);

        // 叫赖子
        room.pushMessage(CONST.PUSH.CHOOSE_LAIZI_PUSH, {
            laizi: room.laizi
        });

        // 需要重新排序手牌
        for (var i = 0; i < room.player_count; i++) {
            var player = room.players[i];

            poker_util.sortPokersWithLaizi(player.holds, room.laizi);
        }
    }

    // 准备底牌
    var hold_count = 17;
    if (room.settings.player_count === 4) {
        hold_count = 12;
    }
    for (i = room.player_count * hold_count; i < room.pokers.length; i++) {
        room.bottom_pokers.push(room.pokers[i]);
    }

    // 显示底牌
    room.pushMessage(CONST.PUSH.BOTTOM_POKERS_PUSH, {
        pokers: room.bottom_pokers
    });

    // 底牌要送给地主
    var landlord_player = null;
    for (i = 0; i < room.player_count; i++) {
        if (room.players[i].is_landlord) {
            landlord_player = room.players[i];
            break;
        }
    }
    for (i = 0; i < room.bottom_pokers.length; i++) {
        landlord_player.holds.push(room.bottom_pokers[i]);
    }
    // 重新排序
    poker_util.sortPokersWithLaizi(landlord_player.holds, room.laizi);
    landlord_player.poker_count += room.bottom_pokers.length;

    // 给地主通知手牌
    room.sendMsg(landlord_player.id, CONST.PUSH.PLAYER_HOLDS_PUSH, landlord_player.holds);

    // 给其他玩家通知手牌数目
    room.pushMessage(CONST.PUSH.PLAYER_POKER_COUNT_PUSH, {
        player_index: landlord_player.index,
        poker_count: landlord_player.poker_count
    });

    // 等待显示赖子的动画, 进入游戏开始
    var self = this;
    var span;
    if (room.settings.play_method === this.CONSTANT.PLAY_METHOD.LAIZI && room.settings.player_count === 3) {
        span = self.SPAN.CHOOSE_LAIZI;
    } else {
        span = self.SPAN.READY_TO_START;
    }
    room.waiting_action = {
        timeout: true,
        remain_time: span,
        handler: function() {
            self.startPlay(room);
        }
    };
};

/**
 * 开始游戏
 *
 * @param room
 */
DouDiZhuGameModule.prototype.startPlay = function(room) {
    room.game_status = CONST.GAME_STATUS.PLAYING;

    // 保存这一局的基本信息, 一局结束后保存到数据库
    this.backupRoundInfo(room);

    // 通知游戏开始
    room.pushMessage(CONST.PUSH.GAME_PLAY_PUSH);

    // 地主开始操作
    var landlord_index = -1;
    for (var i = 0; i < room.player_count; i++) {
        if (room.players[i].is_landlord) {
            landlord_index = room.players[i].index;
        }
    }
    room.turn = (landlord_index - 1 + room.player_count) % room.player_count;
    this.moveToNextUser(room);
};

/**
 * 备份回合信息
 *
 * @param room
 */
DouDiZhuGameModule.prototype.backupRoundInfo = function(room) {
    var round_info = {
        button: room.button,
        bottom_score: room.bottom_score,
        bottom_pokers: room.bottom_pokers,
        laizi: room.laizi,
        holds: new Array(room.player_count)
    };

    for (var i = 0; i < room.player_count; i++) {
        round_info.holds[i] = [].concat(room.players[i].holds);
    }

    room.round_info = round_info;
};

/**
 * 移动轮子
 *
 * @param room
 */
DouDiZhuGameModule.prototype.moveToNextUser = function(room) {
    var self = this;
    if (room.turn === -1) {
        room.turn = room.button;
    } else {
        room.turn = (room.turn + 1) % room.player_count;

        if (room.turn === room.last_chu_pai.index) {
            // 清理这一轮操作记录
            this.clearTurnRecords(room);
        }
    }

    // 玩家可以操作，进入倒计时(超时，自动【不出】)
    room.waiting_action = {
        timeout: true,
        remain_time: this.SPAN.OPERATION_LIMIT,
        handler: function() {
            if (room.isMatchFieldRoom()) {
                // 超时, 自动托管状态
                self.doSetManage(room, room.players[room.turn], true);

                if (room.game_status === CONST.GAME_STATUS.PLAYING) {
                    self.moveToNextUser(room);
                }
            }
        }
    };

    room.pushMessage(CONST.PUSH.PLAYER_TURN_PUSH, {
        turn: room.turn,
        remain_time: this.SPAN.OPERATION_LIMIT / 1000
    });

    if (room.game_status === CONST.GAME_STATUS.PLAYING) {
        var player = room.players[room.turn];

        if (room.last_chu_pai.index >= 0) {
            // 之前的玩家出了牌
            player.hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, room.last_chu_pai.pattern, room.settings);

            if (player.is_managed) {
                // 玩家托管操作
                if (room.isAllRobotPlayer()) {
                    // 都是机器人, 不用等待
                    self.doManagedOperation(room, player);
                } else {
                    room.waiting_action = {
                        timeout: true,
                        remain_time: this.SPAN.MANAGE_DELAY,
                        handler: function () {
                            // 超时, 自动托管状态
                            self.doManagedOperation(room, player);
                        }
                    };
                }
            } else {
                // 玩家自己出牌
                room.sendMsg(player.id, CONST.PUSH.CANDIDATE_POKERS_PUSH, {
                    candidates: player.hint_candidates
                });
            }
        } else {
            // 从玩家开始出牌
            if (player.is_managed) {
                if (room.isAllRobotPlayer()) {
                    // 都是机器人, 不用等待
                    self.doManagedOperation(room, player);
                } else {
                    // 玩家托管操作
                    room.waiting_action = {
                        timeout: true,
                        remain_time: this.SPAN.MANAGE_DELAY,
                        handler: function () {
                            // 超时, 自动托管状态
                            self.doManagedOperation(room, player);
                        }
                    };
                }
            }
        }
    }
};

/**
 * 托管操作
 *
 * @param room
 * @param player
 */
DouDiZhuGameModule.prototype.doManagedOperation = function(room, player) {
    GameModule.prototype.doManagedOperation.call(this, room, player);

    if (room.game_status === CONST.GAME_STATUS.FINISHED) {
        return;
    }

    if (room.game_status === CONST.GAME_STATUS.JIAOPAI) {
        // 叫牌, 直接叫三分
        this.doJiaoPai(room, player, 3);
        return;
    }

    // hint_candidates到holds的变换器, 返回手牌中可出的牌组
    var candidateHoldPokers = function(number_pokers) {
        var pokers = [];

        var dirty = {};
        for (var i = 0; i < player.holds.length; i++) {
            var poker_number = poker_util.weightedNumber(player.holds[i]);

            for (var j = 0; j < number_pokers.length; j++) {
                var number_poker = number_pokers[j];
                if (number_poker === poker_number && !dirty[j]) {
                    pokers.push(player.holds[i]);
                    dirty[j] = true;
                    break;
                }
            }
        }

        return pokers;
    };

    var number_pokers;
    if (room.last_chu_pai.index === -1) {
         // 玩家开始出牌, 出单牌
        number_pokers = this.getAutoChuPais(room, player);
        this.doChuPai(room, player, candidateHoldPokers(number_pokers));
        return;
    }

    if (player.hint_candidates.length === 0) {
        // 要不起, 直接过
        this.doGuo(room, player);
        return;
    }

    // 如果出牌的是自己队友, 直接过
    var last_chu_pai_player = room.players[room.last_chu_pai.index];
    if (player.is_landlord === last_chu_pai_player.is_landlord) {
        this.doGuo(room, player);
        return;
    }

    // 只要不是自己队友, 能压就压
    this.doChuPai(room, player, candidateHoldPokers(player.hint_candidates[0]));
};

/**
 * 决定自动出的牌组
 *      轮到托管玩家开始出牌, 决定要出哪一张牌型, 并返回
 *
 * @param room
 * @param player
 */
DouDiZhuGameModule.prototype.getAutoChuPais = function(room, player) {
    var hint_candidates;

    // 炸弹
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.BOMB,
        weight: 0,
        length: 4,
        pokers: [3, 3, 3, 3]
    }, room.settings);
    if (hint_candidates.length > 0 && player.holds.length === 4) {
        return hint_candidates[0];
    }

    // 火箭
    var count_map = poker_util.countMap(player.holds, room.laizi);
    if (player.holds.length === 2 && poker_util.isRocket(count_map, 0)) {
        return player.holds;
    }

    // 飞机带对子
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.PLANE_WITH_WING_PAIR,
        weight: 0,
        length: 2,
        pokers: [3, 3, 3, 4, 4, 4, 5, 5, 6, 6]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 飞机带单牌
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.PLANE_WITH_WING_SINGLE,
        weight: 0,
        length: 2,
        pokers: [3, 3, 3, 4, 4, 4, 5, 6]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 三顺
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.TRIPLE_STRAIGHT,
        weight: 0,
        length: 2,
        pokers: [3, 3, 3, 4, 4, 4]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 双顺
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.PAIR_STRAIGHT,
        weight: 0,
        length: 3,
        pokers: [3, 3, 4, 4, 5, 5]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 单顺
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.STRAIGHT,
        weight: 0,
        length: 5,
        pokers: [3, 4, 5, 6, 7]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 三带一对子
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.TRIPLE_WITH_PAIR,
        weight: 0,
        length: 5,
        pokers: [3, 3, 3, 4, 4]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 三带一单牌
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.TRIPLE_WITH_SINGLE,
        weight: 0,
        length: 4,
        pokers: [3, 3, 3, 4]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 三同
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.TRIPLE,
        weight: 0,
        length: 3,
        pokers: [3, 3, 3]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 对子
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.PAIR,
        weight: 0,
        length: 2,
        pokers: [3, 3]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    // 单牌
    if (count_map[3] === 1) {
        return [3];
    }
    hint_candidates = poker_util.candidateChuPaiList(player.holds, room.laizi, {
        name: poker_util.PATTERN_NAME.SINGLE,
        weight: 0,
        length: 1,
        pokers: [3]
    }, room.settings, true);
    if (hint_candidates.length > 0) {
        return hint_candidates[0];
    }

    return [player.holds[player.holds.length - 1]];
};

/**
 * 清理轮子记录
 *
 * @param room
 */
DouDiZhuGameModule.prototype.clearTurnRecords = function (room) {
    // 1. 清理玩家的操作记录
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        player.turn_record = this.TURN_RECORD.WAITING;
    }

    // 2. 清理最后的牌型
    room.last_chu_pai = {
        index: -1,
        pattern: {
            name: poker_util.PATTERN_NAME.NONE,
            weight: 0,
            length: 0,
            pokers: []
        }
    };
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家操作相关
//
//  recordPlayerAction:             记录玩家操作
//
//  doAction:                       玩家操作
//
//  doJiaoPai:                      叫牌
//  doChuPai:                       出牌
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 记录玩家操作
 *
 * @param room
 * @param player
 * @param action
 * @param pattern
 */
DouDiZhuGameModule.prototype.recordPlayerAction = function(room, player, action, pattern) {
    room.action_list.push(player.index);
    room.action_list.push(action);
    if (pattern) {
        room.action_list.push(JSON.stringify(pattern));
    } else {
        room.action_list.push(null);
    }
};

/**
 * 玩家操作
 *
 * @param room
 * @param player
 * @param action
 */
DouDiZhuGameModule.prototype.doAction = function(room, player, action) {
    GameModule.prototype.doAction.call(this, room, player, action);

    switch (action.type) {
        case this.ACTION.JIAO_PAI:
            this.doJiaoPai(room, player, action.score);
            break;

        case this.ACTION.CHU_PAI:
            this.doChuPai(room, player, action.pokers);
            break;
        case this.ACTION.VIEW_PAI:
            this.doViewPai(room, player);
            break;
    }
};

DouDiZhuGameModule.prototype.doViewPai = function(room, player) {
    var data = [];
    for(var i = 0; i < room.players.length; i++) {
        var tmp = {};
        tmp.id = i;
        tmp.holds = room.players[i].holds;
        data.push(tmp);
    }
    room.sendMsg(player.id, CONST.PUSH.VIP_VIEW_PAI_PUSH , data);
};

/**
 * 不出
 *
 * @param room
 * @param player
 */
DouDiZhuGameModule.prototype.doGuo = function(room, player) {
    // 没轮到自己, 不能过
    if (room.turn !== player.index) {
        return;
    }

    // 这一轮自己开头, 不能过
    if (room.last_chu_pai.index === -1) {
        return;
    }

    // 玩家操作为【过】
    player.turn_record = this.TURN_RECORD.GUO;

    // 清理提示牌组
    player.hint_candidates = [];

    // 记录玩家操作
    this.recordPlayerAction(room, player, this.ACTION.GUO);

    // 通知其他玩家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.GUO
    });

    var self = this;
    room.waiting_action = {
        timeout: true,
        remain_time: self.SPAN.ANIM_GUO,
        handler: function() {
            // 轮到下一个玩家操作
            self.moveToNextUser(room);
        }
    };
};

/**
 * 叫牌
 *
 * @param room
 * @param player
 * @param score
 */
DouDiZhuGameModule.prototype.doJiaoPai = function(room, player, score) {
    // 玩家已经叫了牌
    if (player.jiao_pai >= 0) {
        return;
    }

    // 如果已经有地主决定
    for (var i = 0; i < room.player_count; i++) {
        if (room.players[i].is_landlord) {
            return;
        }
    }

    // 更新叫牌
    player.jiao_pai = score;
    if (room.max_jiao_pai < score) {
        room.max_jiao_pai = score;
    }

    // 广播通知给其他玩家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.JIAO_PAI,
        score: score
    });

    var self = this;
    var chooseLordFinished = function(player, bottom_score) {
        player.is_landlord = true;
        room.bottom_score = bottom_score;

        room.pushMessage(CONST.PUSH.CHOOSE_LANDLORD_PUSH, {
            player_index: player.index,
            bottom_score: bottom_score
        });

        // 就是地主, 进入抽赖子的环节
        room.waiting_action = {
            timeout: true,
            remain_time: self.SPAN.JIAO_PAI,
            handler: function() {
                self.chooseLaizi(room);
            }
        };
    };

    var max_jiao_pai = -1, max_jiao_index = -1, jiao_count = 0;
    for (i = 0; i < room.player_count; i++) {
        if (room.players[i].jiao_pai > max_jiao_pai) {
            max_jiao_index = i;
            max_jiao_pai = room.players[i].jiao_pai;
        }

        if (room.players[i].jiao_pai >= 0) {
            jiao_count ++;
        }
    }

    if (jiao_count === room.player_count && max_jiao_pai === 0) {
        // 玩家都不叫, 就重新发牌
        console.log('要重新发牌');
        room.waiting_action = {
            timeout: true,
            remain_time: self.SPAN.NO_LANDLORD_HINT,
            handler: function() {
                // 初始化玩家信息
                for (var i = 0; i < room.players.length; i++) {
                    self.resetPlayer(room, room.players[i]);
                }
                self.startZhuapai(room);
            }
        };
        return;
    }

    // 如果叫的是最大的分数, 就是地主, 进入下一个环节
    if (room.settings.zha_dan === this.CONSTANT.ZHA_DAN.PINGJIA) {
        // 炸弹平加
        if (score === 1) {
            chooseLordFinished(player, score);
        } else {
            // 轮到下一个玩家叫牌
            self.moveToNextUser(room);
        }
    } else {
        // 炸弹加倍
        if (score === 3) {
            // 直接地主
            chooseLordFinished(player, score);
        } else if (jiao_count === room.player_count && max_jiao_pai > 0) {
            chooseLordFinished(room.players[max_jiao_index], max_jiao_pai);
        } else {
            // 轮到下一个玩家叫牌
            self.moveToNextUser(room);
        }
    }
};

/**
 * 出牌
 *
 * @param room
 * @param player
 * @param pokers
 */
DouDiZhuGameModule.prototype.doChuPai = function(room, player, pokers) {
    // 轮到自己才可以出牌
    if (room.turn !== player.index) {
        return;
    }

    if (pokers.length === 0) {
        return;
    }

    // 要出的牌组, 要大于最后出的牌组
    var pattern = poker_util.patternCanWin(pokers, room.last_chu_pai.pattern, room.laizi, room.settings);
    if (! pattern) {
        return;
    }

    // 如果手里没有此牌组, 就不能删除
    if (! poker_util.contains(player.holds, pokers)) {
        return;
    }

    // 排序
    poker_util.sortPokersWithLaizi(pokers, room.laizi);

    // 从手牌中删除, 排序
    player.holds = poker_util.deletePokers(player.holds, pokers);
    player.poker_count -= pokers.length;
    poker_util.sortPokersWithLaizi(player.holds, room.laizi);

    // 清理提示牌组
    player.hint_candidates = [];

    // 清理这一轮操作记录
    for (var i = 0; i < room.player_count; i++) {
        room.players[i].turn_record = this.TURN_RECORD.WAITING;
    }

    // 更新最后出的牌型
    room.last_chu_pai.index = player.index;
    room.last_chu_pai.pattern = pattern;

    // 玩家操作为【出】
    player.turn_record = this.TURN_RECORD.CHU_PAI;

    // 记录玩家操作
    this.recordPlayerAction(room, player, this.ACTION.CHU_PAI, pattern);

    // 记录出牌次数
    if (player.is_landlord) {
        room.landlord_chu_pai_count ++;
    } else {
        room.peasant_chu_pai_count ++;
    }

    // 如果是炸弹, 记录炸弹次数
    if (pattern.name === poker_util.PATTERN_NAME.BOMB || pattern.name === poker_util.PATTERN_NAME.ROCKET) {
        room.bomb_count ++;
    }

    // 通知其他玩家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.CHU_PAI,
        pattern: pattern
    });

    // 给当前玩家通知手牌
    room.sendMsg(player.id, CONST.PUSH.PLAYER_HOLDS_PUSH, player.holds);

    // 给其他玩家通知手牌数目
    room.pushMessage(CONST.PUSH.PLAYER_POKER_COUNT_PUSH, {
        player_index: player.index,
        poker_count: player.poker_count
    });

    // 如果手里没有牌, 游戏就结束
    var self = this;
    if (player.poker_count === 0) {
        // 游戏已经结束了
        room.game_status = CONST.GAME_STATUS.FINISHED;

        player.is_winner = true;

        // 判断是否春天
        if (this.isSpring(room, player)) {
            // 当做一个炸弹
            room.bomb_count ++;

            // 给其他玩家通知春天
            room.pushMessage(CONST.PUSH.SPRING_PUSH, {
                player_index: player.index
            });
        }


        // 先要显示最后出的牌
        room.waiting_action = {
            timeout: true,
            remain_time: self.SPAN.SHOW_LAST_PAI,
            handler: function () {
                self.doShowLastPai(room);
            }
        };
    } else {
        room.waiting_action = {
            timeout: true,
            remain_time: self.SPAN.ANIM_CHU_PAI,
            handler: function() {
                // 轮到下一个玩家操作
                self.moveToNextUser(room);
            }
        };
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏结束相关
//
//  isSpring:                           是否春天
//
//  doShowLastPai:                      要显示最后出的牌
//
//  delayRoundOver:                     延迟回合结束
//  doRoundOver:                        回合结束
//  showTotalResult:                    游戏结束
//  decideNextRoundButton:              决定下一回合庄家
//  calculateRoundResult:               计算回合分数
//  recordRoundResultToPlayers:         回合信息记录到玩家, 并准备通知给客户端的玩家信息
//  saveRound:                          保存回合信息
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 是否春天
 *
 * @param room
 * @param player
 * @returns {boolean}
 */
DouDiZhuGameModule.prototype.isSpring = function(room, player) {
    return ((player.is_landlord && room.peasant_chu_pai_count === 0) ||
            (!player.is_landlord && room.landlord_chu_pai_count === 1 && room.settings.zha_dan === this.CONSTANT.ZHA_DAN.JIABEI));
};

/**
 * 要显示最后出的牌
 *
 * @param room
 */
DouDiZhuGameModule.prototype.doShowLastPai = function(room) {
    var data = [];
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        // 准备手牌
        data.push({
            player_index: player.index,
            holds: player.holds
        });
    }

    // 推送
    room.pushMessage(CONST.PUSH.SHOW_LAST_HOLDS_PUSH, data);

    this.delayRoundOver(room);
};

/**
 * 延迟回合结束
 *
 * @param room
 * @param force_exit
 */
DouDiZhuGameModule.prototype.delayRoundOver = function(room, force_exit) {
    var self = this;
    room.waiting_action = {
        timeout: true,
        remain_time: this.SPAN.ROUND_OVER_HINT,
        handler: function() {
            self.doRoundOver(room, force_exit);
        }
    }
};

/**
 * 回合结束
 *
 * @param room
 * @param force_exit
 */
DouDiZhuGameModule.prototype.doRoundOver = function(room, force_exit) {
    room.status = CONST.ROOM_STATUS.PLAYING;
    room.game_status = CONST.GAME_STATUS.FINISHED;

    if (force_exit) {
        if (room.round_no >= 1) {
            this.showTotalResult(room, true);
        } else {
            room.finishGame(true);
        }
    } else {
        // 如果不是强行退出, 则算回合分
        var round_result = this.calculateRoundResult(room);
        room.round_result = round_result;
        room.round_over_time = UTIL.getTimeDesc();

        // 记录回合分数给玩家
        var players = this.recordRoundResultToPlayers(room);

        var self = this;
        // 保存回合信息
        this.saveRound(room, function(err) {
            if (err) {
                return console.log('保存回合信息失败', err.stack);
            }

            // 通知给玩家
            room.pushMessage(CONST.PUSH.ROUND_OVER_PUSH, {
                players: players,
                round_result: round_result,
                round_over_time: room.round_over_time
            });

            // 游戏总结算结果
            if (room.round_no >= room.settings.round_count) {
                self.showTotalResult(room);
            } else {
                // 决定下一局庄家
                self.decideNextRoundButton(room);

                // 设置庄家
                room.button = room.next_button;

                // 游戏状态改为ready
                room.game_status = CONST.GAME_STATUS.WAITING;
                /*room.waiting_action = {
                    timeout: true,
                    remain_time: self.SPAN.OPERATION_LIMIT,
                    handler: function () {
                        for (var i = 0; i < room.player_count; i++) {
                            var player = room.players[i];
                            if (!player.is_ready) {
                                self.doReady(room, player);
                            }
                        }
                    }
                };*/
                if (room.isMatchFieldRoom()) {
                    var has_human_player = false;
                    // 机器人马上准备
                    for (var i = 0; i < room.player_count; i++) {
                        var player = room.players[i];
                        if (player.is_robot) {
                            self.doReady(room, player);
                            console.log('房间【', room.id, '】的机器人【', player.base_info.name, '】准备完毕~');
                        } else {
                            has_human_player = true;
                        }
                    }

                    if (has_human_player) {
                        // 指定时间之后, 进入下一轮
                        room.waiting_action = {
                            timeout: true,
                            remain_time: self.SPAN.OPERATION_LIMIT,
                            handler: function () {
                                for (var i = 0; i < room.player_count; i++) {
                                    var player = room.players[i];
                                    if (!player.is_ready) {
                                        self.doReady(room, player);
                                    }
                                }
                            }
                        };
                    }
                }
            }
        });
    }
};

/**
 * 游戏结束
 *
 * @param room
 * @param force_exit
 */
DouDiZhuGameModule.prototype.showTotalResult = function(room, force_exit) {
    // 如果结束了, 推送总统计
    var total_result = [];
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        total_result.push({
            id: player.base_info.id,
            name: player.base_info.name,
            avatar: player.base_info.avatar,

            score: player.score
        });
    }

    room.room_result = total_result;

    //  推送游戏结果数据
    room.pushMessage(CONST.PUSH.GAME_FINISHED_PUSH, {
        players: total_result,
        time: UTIL.getTimeDesc(),
        force_exit: force_exit
    });

    if (room.isMatchFieldRoom()) {
        // -- 比赛场房间 --
        // 更新计分板
        room.match_field.updateScoreBoard(room);

        if (room.match_field.getGameRoomCount() === 1) {
            // 这是最后游戏房间, 计算排名
            room.match_field.calculateRanking();
        } else {
            // 还有其他房间在玩, 通知【等待中】
            room.match_field.sendScoreBoardWaitingResult(room);
        }
    }

    room.finishGame(force_exit);
};

/**
 * 决定下一回合庄家
 *
 * @param room
 */
DouDiZhuGameModule.prototype.decideNextRoundButton = function(room) {
    var winner_player = null;
    for (var i = 0; i < room.player_count; i++) {
        if (room.players[i].is_winner) {
            winner_player = room.players[i];
            break;
        }
    }

    if (! winner_player) {
        return console.log('没有赢家?! 不科学~');
    }

    // 赢家就是下一局庄家
    //room.next_button = winner_player.index;
    room.next_button = room.round_no % room.player_count;
};

/**
 * 计算回合分数
 *
 * @param room
 * @returns {*}
 */
DouDiZhuGameModule.prototype.calculateRoundResult = function(room) {
    var self = this;
    // 本回合分数都保存到这儿
    var results = [];

    for (var i = 0; i < room.player_count; i++) {
        results[i] = {};
        results[i].score = 0;
    }

    var winner_player = null;
    var landlord_player = null;
    var player;
    for (i = 0; i < room.player_count; i++) {
        player = room.players[i];
        if (player.is_winner) {
            winner_player = player;
        }

        if (player.is_landlord) {
            landlord_player = player;
        }
    }

    if (! winner_player) {
        console.log('没有赢家?! 这不科学~');
        return null;
    }

    var calculateBombScore = function() {
        var bomb_score = 0;
        var base_multiplier = 1;

        if (room.settings.zha_dan === self.CONSTANT.ZHA_DAN.PINGJIA) {
            // 炸弹平加
            for (i = 0; i < room.bomb_count && i < room.settings.feng_ding; i++) {
                bomb_score += base_multiplier * room.bottom_score;
            }
        } else {
            // 炸弹加倍
            var multiplier = 1;
            for (var i = 0; i < room.bomb_count && i < room.settings.feng_ding; i++) {
                bomb_score += base_multiplier * room.bottom_score * multiplier;
                multiplier *= 2;
            }
        }

        return bomb_score;
    };

    var calculateBottomScore = function() {
        return room.bottom_score;
    };

    var bomb_score = calculateBombScore();
    var bottom_score = calculateBottomScore();

    // 算分
    for (i = 0; i < room.player_count; i++) {
        player = room.players[i];
        if (player.is_landlord) {
            continue;
        }

        if (winner_player.is_landlord) {
            // 地主赢了
            results[player.index].score -= bomb_score + bottom_score;
            results[winner_player.index].score += bomb_score + bottom_score;
        } else {
            // 农民赢了
            results[player.index].score += bomb_score + bottom_score;
            results[landlord_player.index].score -= bomb_score + bottom_score;
        }
    }

    if (! winner_player.is_landlord) {
        // 农民赢了, 所有农民都标记为【赢】
        for (i = 0; i < room.player_count; i++) {
            if (! room.players[i].is_landlord) {
                room.players[i].is_winner = true;
            }
        }
    } else {
        // 地主赢了
        winner_player.is_winner = true;
    }

    // 考虑春天
    /*
    if (this.isSpring(room, winner_player)) {
        var score;
        if (winner_player.is_landlord) {                                                                                //  地主春天
            if (room.settings.zha_dan === self.CONSTANT.ZHA_DAN.JIABEI) {                                                    //  炸弹加倍
                score = 3;
            } else {                                                                                                    //  炸弹平加
                score = 2;
            }

            for (i = 0; i < room.player_count; i++) {
                if (room.players[i].is_landlord) {
                    continue;
                }

                results[room.players[i].index].score -= score;
                results[winner_player.index].score += score;
            }
        } else {                                                                                                        //  农民春天
            if (room.settings.zha_dan === self.CONSTANT.ZHA_DAN.JIABEI) {
                score = 3;

                for (i = 0; i < room.player_count; i++) {
                    if (room.players[i].is_landlord) {
                        continue;
                    }

                    results[room.players[i].index].score += score;
                    results[landlord_player.index].score -= score;
                }
            } else {
                // 炸弹平加, 没有农民春天
            }
        }
    }*/

    return results;
};

/**
 * 回合信息记录到玩家, 并准备通知给客户端的玩家信息
 *
 * @param room
 * @returns {Array}
 */
DouDiZhuGameModule.prototype.recordRoundResultToPlayers = function(room) {
    var result_data = [];
    var round_result = room.round_result;
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        player.is_ready = false;

        // 下面信息只需要在服务端统计, 不需要通知给前端
        player.score += round_result[i].score;

        // result_data是需要通知给前端
        result_data[i] = this.getPlayerData(room, player);
    }

    return result_data;
};

/**
 * 保存回合信息
 *
 */
DouDiZhuGameModule.prototype.saveRound = function(room, callback) {
    callback = callback || function() {};

    // 插入用户信息
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        if (player) {
            room.round_result[i].id = player.base_info.id;
            room.round_result[i].name = player.base_info.name;
            room.round_result[i].avatar = player.base_info.avatar;
            room.round_result[i].is_landlord = player.is_landlord;
        }
    }

    room.roundOver(callback);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  其他
//
//  update:     执行游戏逻辑
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 执行游戏逻辑
 *
 * @param room
 * @param dt
 */
DouDiZhuGameModule.prototype.update = function(room, dt) {
    if (! room || room.status === CONST.ROOM_STATUS.FINISHED) {
        return;
    }

    // 执行等待的操作
    var action = room.waiting_action;
    if (action && action.remain_time > 0) {
        action.remain_time -= dt;
        if (action.remain_time <= 0) {
            action.remain_time = 0;

            if (action.timeout) {
                action.handler();
            }
        }
    }
};

module.exports = new DouDiZhuGameModule();