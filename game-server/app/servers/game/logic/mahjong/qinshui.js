/**
 * Created by leo on 3/27/2018.
 */

var mj_util = require('./mj_util');
var MahjongGameModule = require('./mahjong');

function QinshuiGameModule() {
    MahjongGameModule.call(this);

    // -- 沁水麻将CONSTANT --
    // 逼金
    this.CONSTANT.BI_JIN = {
        FIRST: 'first',                                                                                                 //  逼头金
        SECOND: 'second',                                                                                               //  逼二金
        NONE: 'none'                                                                                                    //  不逼金
    };
    // 金分倍数
    this.CONSTANT.SHUAI_JIN = {
        PINGJIA: 'pingjia',                                                                                             //  平加
        JIABEI: 'jiabei'                                                                                                //  加倍
    };
    // 点杠/炮
    this.CONSTANT.GANG_PAO = {
        YI_JIA: 'yijia',                                                                                                //  点杠/炮一家付
        SAN_JIA: 'sanjia'                                                                                               //  点杠/炮三家付
    };

    // 沁水麻将有【吃】
    this.has_chi = true;
}

QinshuiGameModule.prototype = new MahjongGameModule();
QinshuiGameModule.prototype.constructor = QinshuiGameModule;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  房间相关
//
//  canCreateRoom:          检查是否可以创建房间
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 检查是否可以创建房间
 *
 * @param user  用户信息
 * @param conf
 *      type    房间类型(private/club)
 *      club_id(optional)   俱乐部ID
 *      settings  创建选项
 *          bi_jin      逼金
 *          shuai_jin   金分倍数
 *          gang_pao    点杠/炮一家付/三家付
 *
 *          has_no_chi  不可吃(可选)
 *          has_chi_koufen  吃牌扣分(可选)
 *          has_shiqiang 十三幺可拾抢(可选)
 *          has_shaojin_zimo 上金少者只能自摸(可选)
 *          has_moshi 成五摸拾(可选)
 *          has_peijin 赔金(可选)
 * @param callback
 * @returns {*}
 */
QinshuiGameModule.prototype.canCreateRoom = function(user, conf, callback) {
    var self = this;

    MahjongGameModule.prototype.canCreateRoom.call(this, user, conf, function(err) {
        if (err) {
            return callback(err);
        }

        var type = conf.type;
        var settings = conf.settings;

        var fee_method = settings.fee_method;                                                                           //  房费
        var needed_gems;
        var club_creator_id;

        var doCheck = function() {
            /*var bi_jin = settings.bi_jin;                           //  逼金
            var shuai_jin = settings.shuai_jin;                     //  金分倍数
            var gang_pao = settings.gang_pao;                       //  点杠/炮一家付/三家付

            // 1. 逼金
            if (bi_jin !== self.CONSTANT.BI_JIN.FIRST &&
                bi_jin !== self.CONSTANT.BI_JIN.SECOND &&
                bi_jin !== self.CONSTANT.BI_JIN.NONE) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 2. 金分倍数
            if (shuai_jin !== self.CONSTANT.SHUAI_JIN.PINGJIA &&
                shuai_jin !== self.CONSTANT.SHUAI_JIN.JIABEI) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 3. 点杠/炮一家付/三家付
            if (gang_pao !== self.CONSTANT.GANG_PAO.YI_JIA && gang_pao !== self.CONSTANT.GANG_PAO.SAN_JIA) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }*/

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
                // 房主3个房卡
                needed_gems = 4;
            }
            if (user.gems < needed_gems) {
                return callback(ERROR.NOT_ENOUGH_GEMS);
            }

            // 接着检查
            doCheck();
        } else if (type === CONST.ROOM_TYPE.CLUB) {                                                                    //   俱乐部
            // 房主3个房卡
            needed_gems = 4;

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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家信息相关
//
//  resetPlayer:            初始化玩家信息（每局开始前的初始化）
//
//  getPlayerData:          获取玩家的公共信息（供给前端用）
//  getPlayerChoices:       准备玩家的可用操作
//
//  getMaxJinFold:          获取已打出的最大金牌数
//  getHoldJinCount:        获取手牌中金牌的数量
//  needAutoChuJinPai:      是否需要自动出金牌
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 初始化玩家信息（每局开始前的初始化）
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.resetPlayer = function(room, player) {
    MahjongGameModule.prototype.resetPlayer.call(this, room, player);

    // 吃牌操作记录(吃牌扣分用到)
    player.chi_actions = [];

    // 十三幺可拾抢(开关)
    player.can_shiqiang = false;
    // 是否已经决定了上面的开关
    player.has_decided_shiqiang = false;
    // 是否可以拾牌
    player.can_shi = false;
    // 是否可以抢牌
    player.can_qiang = false;
    // 是否已经抢过牌
    player.has_qiang = false;
    // 拾抢的牌
    player.shi_qiangs = [];

    // 逼金
    player.can_bijin = false;
};

/**
 * 获取玩家的公共信息（供给前端用）
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param is_me: 是否我的信息
 */
QinshuiGameModule.prototype.getPlayerData = function(room, player, is_me) {
    var player_data = MahjongGameModule.prototype.getPlayerData.call(this, room, player, is_me);

    // 沁水的固有属性
    player_data.has_decided_shiqiang = player.has_decided_shiqiang;
    player_data.shi_qiangs = player.shi_qiangs;
    player_data.has_qiang = player.has_qiang;

    return player_data;
};

/**
 * 准备玩家的可用操作
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.getPlayerChoices = function(room, player) {
    var choices = MahjongGameModule.prototype.getPlayerChoices.call(this, room, player);

    // 拾抢
    choices.can_shi = player.can_shi;
    choices.can_qiang = player.can_qiang;

    // 逼金
    choices.can_bijin = player.can_bijin;

    return choices;
};

/**
 * 获取已打出的最大金牌数
 *
 * @param room: 房间信息
 * @returns {number}: 最大金牌数
 */
QinshuiGameModule.prototype.getMaxJinFold = function(room) {
    var count = 0;
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        if (count <= player.jin_folds.length) {
            count = player.jin_folds.length;
        }
    }

    return count;
};

/**
 * 获取手牌中金牌的数量
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.getHoldJinCount = function(room, player) {
    var count = 0;
    for (var i = 0; i < room.jin_pais.length; i++) {
        if (player.count_map[room.jin_pais[i]] > 0) {
            count += player.count_map[room.jin_pais[i]];
        }
    }

    return count;
};

/**
* 是否需要自动出金牌
*
* @param room: 房间信息
* @param player: 玩家信息
*/
QinshuiGameModule.prototype.needAutoChuJinPai = function(room, player) {
    if (room.settings.bi_jin === this.CONSTANT.BI_JIN.NONE) {
        // 不逼金
        return false;
    }

    var jin_count = this.getHoldJinCount(room, player);

    if (jin_count === 0) {
        // 手里没有金牌
        return false;
    }

    if (player.jin_folds.length > 0) {
        // 已经有甩出去的金
        return false;
    }

    if (room.settings.bi_jin === this.CONSTANT.BI_JIN.FIRST && jin_count >= 1) {
        // 逼头金
        return true;
    }

    // 逼二金
    return (room.settings.bi_jin === this.CONSTANT.BI_JIN.SECOND && jin_count >= 2);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏相关
//
//  prepareRoundStart:          回合开始初始化
//
//  doRoundStart:               开始新的一局
//
//  chooseJinPai:               叫金
//  shuffle:                    洗牌
//
//  mopai:                      摸牌
//
//  recordChiScore:             记录吃牌分数
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 回合开始初始化
 *
 * @param room: 游戏房间
 */
QinshuiGameModule.prototype.prepareRoundStart = function(room) {
    MahjongGameModule.prototype.prepareRoundStart.call(this, room);

    // 【沁水麻将】 - 杠幺牌可以被拾抢
    room.qianggang_shiqiang = null;
};

/**
 * 开始新的一局
 *
 * @param room: 游戏房间
 */
QinshuiGameModule.prototype.doRoundStart = function(room) {
    MahjongGameModule.prototype.doRoundStart.call(this, room);

    // 叫金
    //this.chooseJinPai(room);
    this.chooseBaoPai(room);
};

/**
 * 叫宝牌
 */
QinshuiGameModule.prototype.chooseBaoPai = function(room) {
    room.game_status = CONST.GAME_STATUS.JIAO_BAO;

    room.bao_pai = UTIL.randomInt(0, this.used_pai_count);

    room.pushMessage(CONST.PUSH.CHOOSE_BAO_PUSH, {
        bao_pai: room.bao_pai
    });

    var self = this;
    room.waiting_action = {
        timeout: true,
        remain_time: this.SPAN.JIAO_BAO,
        handler: function() {
            self.startZhuapai(room);
        }
    };
};
/**
 * 叫金
 *
 * @param room: 游戏房间
 */
QinshuiGameModule.prototype.chooseJinPai = function(room) {
    room.game_status = CONST.GAME_STATUS.JIAO_JIN;

    // by bee
    //room.jin_pais = [30];
    room.jin_pais = []; //[UTIL.randomInt(0, this.used_pai_count)];

    room.pushMessage(CONST.PUSH.CHOOSE_JIN_PUSH, {
        jin_pais: room.jin_pais
    });

    // 时间到开始抓牌, 即叫金动画结束以后
    var self = this;
    room.waiting_action = {
        timeout: true,
        remain_time: this.SPAN.JIAO_JIN,
        handler: function() {
            self.startZhuapai(room);
        }
    };
};

/**
 * 洗牌
 *
 * @param room
 */
QinshuiGameModule.prototype.shuffle = function(room) {
    MahjongGameModule.prototype.shuffle.call(this, room);

    // 一张指定牌放到最后12张里
    var shiftPosition = function(pai, offset) {
        var last_index = room.mahjongs.lastIndexOf(pai);
        if (last_index < room.mahjongs.length - 12) {
            // 跟最后一张牌互换位置
            room.mahjongs[last_index] = room.mahjongs[room.mahjongs.length - offset];
            room.mahjongs[room.mahjongs.length - offset] = pai;
        }
    };

    var partnerJin = function() {
        var jin_pai = room.jin_pais[0];
        if (jin_pai < 27) {
            return Math.floor(jin_pai / 9) * 9 + (8 - jin_pai % 9);
        }
        if (jin_pai === 27) {
            return 29;
        }
        if (jin_pai === 29) {
            return 27;
        }
        if (jin_pai === 30) {
            return 32;
        }
        if (jin_pai === 32) {
            return 30;
        }
        if (jin_pai === 31) {
            return 33;
        }
        if (jin_pai === 33) {
            return 31;
        }

        return jin_pai;
    };

    // 金座(1-9, 2-8, 3-7, 4-6, 中-白, 东-西, 南-北)也只能出现三张(一张放到最后12张)
    var jin_pai = room.jin_pais[0];
    var partner_jin = partnerJin();

    shiftPosition(jin_pai, 1);
    if (partner_jin !== jin_pai) {
        shiftPosition(partner_jin, 2);
    }
};

/**
 * 摸牌
 *
 * @param room: 房间信息
 * @param player_index: 玩家座位
 */
QinshuiGameModule.prototype.mopai = function(room, player_index) {
    // 沁水需要留最后12张
    if (room.current_index + 12 === room.mahjongs.length) {
        return -1;
    }

    return MahjongGameModule.prototype.mopai.call(this, room, player_index);
};

QinshuiGameModule.prototype.testDeal = function(room) {
    MahjongGameModule.prototype.testDeal.call(this, room);

    var player0 = room.players[0];
    var player1 = room.players[1];
    var player2 = room.players[2];
    var player3 = room.players[3];

    /*
    // 十三幺
    player1.holds = [0, 4, 5, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

    // 清一色
    player1.holds = [0, 1, 2, 4, 4, 4, 6, 6, 6, 7, 7, 7, 15];

    // 一条龙
    player1.holds = [17, 17, 0, 2, 2, 21, 18, 19, 20, 22, 23, 24, 25];

    player1.holds[5] = room.jin_pais[0];

    // 七小对
    player1.holds = [29, 29, 27, 2, 2, 3, 3, 6, 14, 14, 23, 23, 27];
    player0.holds[1] = 29;

    //player0.holds = [0, 8, 9, 17, 18, 26, 27, 29, 30, 31, 31, 32, 33];
    player1.holds = [13, 0, 1, 2, 2, 3, 4, 15, 16, 24, 24, 30, 30];
    */

    // 听牌状态下杠牌测试
    /*player1.holds = [2, 2, 2, 3];
    player0.holds[3] = 2;
    player2.holds[3] = 2;*/

    // 多个玩家听同一张牌, 需要逐个提示胡
    // 玩家2出4, 玩家0,3提示胡。正确顺序是3, 1
    //player1.holds = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4]; // 听4
    //player3.holds = [4, 10, 10, 10, 11, 11, 11, 12, 12, 12, 13, 13, 13]; // 听4
    //player2.holds[6] = 4;

    // 吃牌之后听牌
    /*player0.holds[3] = 1;
    player1.holds = [2, 3, 5, 5, 5, 6, 6, 6, 7, 7, 7, 10, 13];*/

    // 胡 + 杠测试
    // 玩家1出8，玩家2可以明杠，玩家3可以胡牌
    /*player1.holds[1] = 8;
    player2.holds = [1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 16, 19, 24];
    player3.holds = [6, 7, 10, 10, 10, 12, 12, 12, 11, 11, 11, 13, 13];*/

    //player0.holds = [0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 4];

    /*room.mahjongs = [30,5,6,28,29,14,13,24,7,3,24,5,21,18,26,11,8,22,2,25,19,4,13,32,18,20,30,9,0,33,21,14,32,1,17,10,16,30,31,27,33,23,10,8,21,19,1,10,3,15,3,0,11,2,14,3,22,28,29,33,15,24,19,7,4,6,31,33,25,21,1,27,22,16,6,5,15,14,22,26,28,12,6,9,16,4,28,13,12,11,31,18,2,20,32,24,12,23,27,5,17,20,19,16,0,27,25,18,2,23,7,11,8,17,20,30,32,7,9,10,29,8,26,25,15,13,9,1,29,12,17,31,4,0,23,26];
    player2.holds = [1,2,3,6,10,13,13,17,21,24,26,30,31];
    player3.holds = [32,0,5,8,9,10,10,11,14,24,25,27,28];
    player0.holds = [32,0,3,7,8,16,18,19,21,21,29,30,33];
    player1.holds = [1,3,4,5,14,15,18,19,20,22,23,30,33];*/

    //player2.holds = [23, 8, 12, 12, 14, 14, 20, 20, 25, 25, 28, 28, 28];
    //player0.holds[3] = 28;

    /*room.mahjongs = [31,11,28,12,33,19,16,15,33,17,3,21,1,28,6,29,15,22,8,5,15,27,31,32,30,5,18,12,25,32,9,28,13,23,16,20,13,3,30,28,26,21,0,22,25,4,7,4,20,21,30,5,27,19,15,2,8,3,29,1,29,31,33,18,25,7,19,16,32,24,2,8,0,4,11,32,0,14,13,19,5,18,18,23,0,13,3,17,26,31,24,1,11,17,7,33,27,6,14,22,10,23,20,20,11,27,6,24,7,4,25,2,14,12,10,1,30,9,9,26,17,10,29,22,10,2,12,6,14,24,8,9,21,23,26,16];
    player0.holds = [1,13,13,15,15,20,25,25,26,30,31,33,33];
    player1.holds = [3,4,5,11,17,19,21,21,22,23,27,28,32];
    player2.holds = [16,16,0,3,6,7,8,9,18,28,30,30,31];
    player3.holds = [4,5,5,12,12,15,20,21,22,28,28,29,32];*/

    // 拾抢 + 杠
    // player0.holds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // player0.pengs = [0];
    // player1.holds[1] = 9;
    // player2.holds = [10, 5, 11, 14, 17, 20, 25, 27, 27, 29, 31, 32, 33];
    /*room.mahjongs = [23,0,29,6,30,7,7,26,15,13,30,9,5,14,17,32,23,22,32,13,25,2,22,19,13,10,4,2,11,29,16,12,29,13,12,25,19,17,26,8,1,21,0,24,24,20,11,8,0,17,21,21,27,18,19,23,3,9,11,16,7,26,4,9,20,21,24,3,1,33,1,10,6,23,25,3,12,5,22,24,20,1,10,3,5,9,14,28,15,33,4,28,30,7,18,19,4,18,20,12,6,6,28,31,26,15,10,27,28,5,14,2,31,11,31,16,18,16,32,2,22,0,33,17,33,31,32,8,15,25,30,8,27,14,29,27];
    player0.holds = [0,4,7,11,12,16,17,21,22,26,29,30,32];
    player1.holds = [2,6,8,8,9,12,13,19,21,24,25,26,32];
    player2.holds = [0,1,5,11,13,15,19,23,23,24,25,29,30];
    player3.holds = [0,2,7,10,13,13,14,17,17,20,21,22,29];*/
    //player1.holds = [0, 8, 9, 16, 18, 26, 27, 29, 33];
    //player1.shi_qiangs = [31, 27, 28, 32];
    //player1.can_shiqiang = true;

    room.mahjongs = [0, 0, 1, 2, 2, 2, 10, 10, 30, 31, 32, 33, 30,
                     1, 1, 2, 3, 3, 3, 11, 11, 10, 27, 28, 29, 29,
                     0, 1, 2, 13, 14, 15, 21, 22, 23, 29, 29, 24, 26,
                     5, 2, 5, 11, 13, 15, 19, 23, 23, 24, 25, 29, 30,
                     9, 9,10,6,23,25,3,12,5,22,24,20,1,10,3,5,9,14,28,15,33,4,28,30,7,18,19,4,18,20,12,6,6,28,31,26,15,10,27,28,5,14,2,31,11,31,16,18,16,32,2,22,0,33,17,33,31,32,8,15,25,30,8,27,14,29,27];
    //room.jin_pais = [30];
    player0.holds = [0, 1, 2, 2, 9, 4, 11, 11, 10, 18, 17, 33, 33];
    player1.holds = [0, 0, 3, 3, 3, 3, 10, 10, 30, 31, 32, 33, 30];
    player2.holds = [0, 1, 2, 13, 14, 15, 21, 22, 23, 29, 29, 24, 26];
    player3.holds = [5, 2, 5, 11, 13, 15, 19, 23, 23, 24, 25, 29, 30];


    //player2.holds = [5,2,5,11,13,15,19,23,23,24,25,29,30];
    //player3.holds = [2,3,4,10,13,13,14,17,17,20,21,22,29];

    for (var i = 0; i < 34; i++) {
        player0.count_map[i] = 0;
        player1.count_map[i] = 0;
        player2.count_map[i] = 0;
        player3.count_map[i] = 0;
    }

    for (var i = 0; i < room.player_count; i++) {
        for (var j = 0; j < room.players[i].holds.length; j++) {
            var pai = room.players[i].holds[j];
            room.players[i].count_map[pai]++;
        }
    }

    // 排序
    for (var i = 0; i < room.player_count; i++) {
        mj_util.sort(room.players[i].holds, room.jin_pais);
    }
};

/**
 * 记录吃牌分数
 *
 * @param room: 游戏房间
 * @param chi_player: 吃牌的玩家
 */
QinshuiGameModule.prototype.recordChiScore = function(room, chi_player) {
    // 点吃的玩家扣2分, 没有参与的玩家各加1分.
    var loser_player = room.players[room.turn];

    if (loser_player.is_ting) {
        return;
    }

    loser_player.patterns.push(this.PATTERN.DIAN_CHI);

    var target_indices = [];
    for (var i = 0; i < room.player_count; i++) {
        var target_player = room.players[i];
        if (target_player.index === chi_player.index || target_player.index === room.turn) {
            continue;
        }

        target_player.patterns.push(this.PATTERN.BONUS_CHI);
        target_indices.push(target_player.index);
    }

    loser_player.chi_actions.push({
        score: 1,
        targets: target_indices
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  手牌判断相关
//
//  filterGangs:                    过滤不可以杠的牌
//
//  checkCanMingGang:               是否可以明杠
//  checkCanAnGang:                 是否可以暗杠
//  checkCanPengGang:               是否可以碰杠
//
//  checkCanShiQiang:               是否可以拾/抢牌
//  checkCanHu:                     是否可以胡牌
//
//  checkCanQiangGang:              是否可以被抢杠
//
//  prepareTingPais:                准备可以胡的牌型(少一张, 用来判断, 如果要胡需要哪一张牌)
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 过滤不可以杠的牌
 *
 * @param room: 房间信息
 * @param player: 要杠牌的玩家
 */
QinshuiGameModule.prototype.filterGangPais = function(room, player) {
    if (! player.can_gang) {
        return;
    }

    if (! player.is_ting) {
        return;
    }

    // 听牌之后也可以杠牌, 前提是杠牌之后照样可以听牌
    var safe_gang_pais = [];
    for (var i = 0; i < player.gang_pais.length; i+=2) {
        var gang_pais = player.gang_pais[i];
        var gang_type = player.gang_pais[i + 1];

        // 逐个检查是否为安全的杠牌
        var old_ting_map = UTIL.simple_clone(player.ting_map);

        if (JSON.stringify(old_ting_map) === '{}') {
            safe_gang_pais.push(gang_pais);
            safe_gang_pais.push(gang_type);
            continue;
        }

        var safe_flag = true;
        for(var j = 0; j < gang_pais.length; j++) {
            var gang_pai = gang_pais[i];
            var old_count = player.count_map[gang_pai];

            player.count_map[gang_pai] = 0;
            player.ting_map = {};
            mj_util.prepareChangchunTingPais(player, 0, this.used_pai_count - 1, room.settings.has_daiquemen);

            // console.log('玩家', player.index, '的old_ting_map', old_ting_map, '新的ting_map', player.ting_map);
            if (JSON.stringify(player.ting_map) !== '{}') {
                console.log('安全');
            } else {
                safe_flag = false;
            }

            player.count_map[gang_pai] = old_count;
            player.ting_map = old_ting_map;
        }
        if(safe_flag === true) {
            safe_gang_pais.push(gang_pais);
            safe_gang_pais.push(gang_type);
        }
    }

    player.gang_pais = safe_gang_pais;
    if (player.gang_pais.length === 0) {
        player.can_gang = false;
    }
};

/**
 * 是否可以明杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param target_pai: 目标牌
 */
QinshuiGameModule.prototype.checkCanMingGang = function(room, player, target_pai) {
    MahjongGameModule.prototype.checkCanMingGang.call(this, room, player, target_pai);

    this.filterGangPais(room, player);
};

/**
 * 是否可以暗杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.checkCanAnGang = function(room, player) {
    MahjongGameModule.prototype.checkCanAnGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以碰杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.checkCanPengGang = function(room, player) {
    MahjongGameModule.prototype.checkCanPengGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以喜杠
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.checkCanXiGang = function(room, player) {
    MahjongGameModule.prototype.checkCanXiGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以旋风杠
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.checkCanXuanFengGang = function(room, player) {
    MahjongGameModule.prototype.checkCanXuanFengGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以幺杠
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.checkCanYaoGang = function(room, player) {
    MahjongGameModule.prototype.checkCanYaoGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以九杠
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.checkCanJiuGang = function(room, player) {
    MahjongGameModule.prototype.checkCanJiuGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以拾/抢牌
 *
 * @param room: 房间信息
 * @param player: 拾/抢牌的玩家
 * @param pai: 拾/抢的牌
 */
QinshuiGameModule.prototype.checkCanShiQiang = function(room, player, pai) {
    pai = parseInt(pai);

    if (player.count_map[pai] > 0 || ! mj_util.isYaoPai(pai) || mj_util.isJinPai(room.jin_pais, pai)) {
        return;
    }

    if (! player.can_shiqiang) {
        // 玩家不再玩十三幺, 不能拾/抢
        return;
    }

    if (player.has_qiang) {
        // 已经抢过牌, 不能再拾/抢
        return;
    }

    // 已经吃过, 碰过, 杠过的玩家, 不能拾抢
    if (player.chis.length + player.pengs.length + player.ming_gangs.length + player.peng_gangs.length + player.an_gangs.length > 0) {
        return;
    }

    // 如果已经拾抢了的, 就不能再拾抢
    var count = 0;
    for (var i = 0; i < player.shi_qiangs.length; i++) {
        if (player.shi_qiangs[i] === pai) {
            count ++;
        }
    }
    if (count >= 1) {
        return;
    }

    if (player.index === (room.turn + 1) % room.player_count) {
        // 轮子的下一家: 拾牌
        player.can_shi = true;
    } else {
        // 其他玩家: 抢牌
        player.can_qiang = true;
    }
};

/**
 * 是否可以胡牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param target_pai: 目标牌
 */
QinshuiGameModule.prototype.checkCanHu = function(room, player, target_pai) {
    MahjongGameModule.prototype.checkCanHu.call(this, room, player, target_pai);
};

/**
 * 是否可以被抢杠
 *
 * @param room: 房间信息
 * @param gang_player: 杠牌的玩家
 * @param pai: 杠的牌
 */
QinshuiGameModule.prototype.checkCanQiangGang = function(room, gang_player, pai) {
    MahjongGameModule.prototype.checkCanQiangGang.call(this, room, gang_player, pai);

    pai = parseInt(pai);
    var has_actions = false;
    for (var i = 0; i < room.player_count; i++) {
        // 从杠牌下一家开始扫描
        var player = room.players[(i + gang_player.index) % room.player_count];

        // 自己不检查
        if (player.index === gang_player.index) {
            continue;
        }

        if (! player.is_ting) {
            continue;
        }

        this.checkCanHu(room, player, pai);

        if (player.can_hu) {
            this.sendOperations(room, player, pai);
            has_actions = true;
            break;
        }
    }

    if (has_actions) {
        room.qianggang_context = {
            player: gang_player,
            pai: pai,
            is_valid: true
        }
    } else {
        room.qianggang_context = null;
    }

    return (room.qianggang_context != null);
};

/**
 * 是否可以被抢Peng
 *
 * @param room: 房间信息
 * @param gang_player: 杠牌的玩家
 * @param pai: 杠的牌
 */
QinshuiGameModule.prototype.checkCanQiangPeng = function(room, gang_player, pai) {
    MahjongGameModule.prototype.checkCanQiangPeng.call(this, room, gang_player, pai);

    pai = parseInt(pai);
    var has_actions = false;
    for (var i = 0; i < room.player_count; i++) {
        // 从杠牌下一家开始扫描
        var player = room.players[(i + gang_player.index) % room.player_count];

        // 自己不检查
        if (player.index === gang_player.index) {
            continue;
        }

        /*if (! player.is_ting) {
            continue;
        }*/

        this.checkCanPeng(room, player, pai);

        if (player.can_peng) {
            this.sendOperations(room, player, pai);
            has_actions = true;
            break;
        }
    }

    if (has_actions) {
        room.qiangpeng_context = {
            player: gang_player,
            pai: pai,
            is_valid: true
        }
    } else {
        room.qiangpeng_context = null;
    }

    return (room.qiangpeng_context != null);
};
/**
 * 准备可以胡的牌型(少一张, 用来判断, 如果要胡需要哪一张牌)
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.prepareTingPais = function(room, player) {
    player.ting_map = {};
    player.fan = 0;

    // 检查是不是平胡
    mj_util.prepareChangchunTingPais(player, 0, this.used_pai_count - 1, room.settings.has_daiquemen);

    MahjongGameModule.prototype.prepareTingPais.call(this, room, player);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家操作相关(1)
//
//  clearAllOptions:            清理指定玩家的所有操作, 【胡】，【杠】，【碰】，【吃】，【拾】，【抢】，【过】之后需要调用
//  hasOperations:              检查有没有【胡】，【杠】，【碰】，【吃】，【拾】，【抢】操作
//
//  doUserTurn:                 轮到玩家, 让他来操作
//
//  doAction:                   玩家进行游戏操作
//
//  toggleShiQiangState:        切换可拾抢状态
//  doShi:                      玩家拾牌
//  doQiang:                    玩家抢牌
//
//  doChi:                      玩家吃牌
//  doPeng:                     玩家碰牌
//  doGang:                     玩家杠牌
//  _doGang:                    玩家杠牌（实际操作）
//  doTing:                     玩家听牌
//  doHu:                       玩家胡牌
//  doGuo:                      玩家过牌
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 清理指定玩家的所有操作, 【胡】，【杠】，【碰】，【吃】，【拾】，【抢】，【过】之后需要调用
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.clearAllOptions = function(room, player) {
    var clear = function(player) {
        player.can_peng = false;
        player.can_gang = false;
        player.gang_pais = [];
        player.can_hu = false;

        player.can_ting = false;

        player.can_chi = false;
        player.chi_pais = [];

        player.can_shi = false;
        player.can_qiang = false;

        player.can_bijin = false;
    };

    if (player) {
        clear(player);
    } else {
        for (var i = 0; i < room.player_count; i++) {
            clear(room.players[i]);
        }
    }
};

/**
 * 检查有没有【胡】，【杠】，【碰】，【吃】，【拾】，【抢】操作
 *
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.hasOperations = function(player) {
    return MahjongGameModule.prototype.hasOperations.call(this, player) || (player.can_shi || player.can_qiang) || (player.can_bijin);
};

/**
 * 轮到玩家, 让他来操作
 *
 * @param room: 房间信息
 * @param did_mopai: 是否摸到了牌
 */
QinshuiGameModule.prototype.doUserTurn = function(room, did_mopai) {
    MahjongGameModule.prototype.doUserTurn.call(this, room, did_mopai);

    var player = room.players[room.turn];

    // 检查能不能胡
    if (did_mopai === true) {
        // 检查碰杠
        this.checkCanPengGang(room, player);

        if (! player.is_ting) {
        } else {
            var last_pai = player.holds[player.holds.length - 1];
            if (this.needAutoChuJinPai(room, player) && mj_util.isJinPai(room.jin_pais, last_pai)) {
                // 逼金, 直接出金牌
                player.can_bijin = true;
                // 用户可以操作
                this.sendOperations(room, player, room.jin_pais[0]);
                return;
            } else {
                // 检查自摸, 用最后一张来检查
                this.checkCanHu(room, player, last_pai);

                // 如果最后一张是金牌, 多一个【甩】操作选项
                if (mj_util.isJinPai(room.jin_pais, last_pai)) {
                    player.can_bijin = true;
                }
            }
        }
    }

    if(player.first_time === true) {
        this.checkCanXuanFengGang(room, player);
        this.checkCanXiGang(room, player);
        this.checkCanYaoGang(room, player);
        this.checkCanJiuGang(room, player);
    }
    // 检查能不能暗杠
    this.checkCanAnGang(room, player);
    // 检查能不能补杠
    this.checkCanBuGang(room, player);

    if (! player.is_ting) {
            if (this.needAutoChuJinPai(room, player)) {
                // 逼金, 直接出金牌
                player.can_bijin = true;
                // 用户可以操作
                this.sendOperations(room, player, room.jin_pais[0]);

            console.log('房间【', room.id, ' 第', room.round_no, '回合 俱乐部: ', room.club_id, '】的玩家【', player.id , ' ', player.base_info.name, '】要逼金, 他的手牌是', player.holds);
        } else {
            // 检查能不能报听
            this.checkCanBaoTing(room, player);

            // 用户可以出牌
            player.can_chu_pai = true;

            // 用户可以操作
            this.sendOperations(room, player, room.chu_pai);
        }
    } else {
        if (this.hasOperations(player)) {
            this.sendOperations(room, player, room.chu_pai);
        } else {
            // 报听, 直接出牌(最后一张)
            var self = this;
            room.waiting_action = {
                timeout: true,
                remain_time: this.SPAN.AUTO_CHU_PAI,
                handler: function () {
                    if (player.can_hu) {
                        self.doHu(room, player);
                    } else {
                        // 用户可以出牌
                        player.can_chu_pai = true;
                        self.doChuPai(room, player, player.holds[player.holds.length - 1]);
                    }
                }
            };
        }
    }
};

/**
 * 玩家进行游戏操作
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param action: 玩家操作
 */
QinshuiGameModule.prototype.doAction = function(room, player, action) {
    MahjongGameModule.prototype.doAction.call(this, room, player, action);

    switch (action.type) {
        case this.ACTION.SET_SHIQIANG:
            // 十三幺可拾抢(开启)
            this.toggleShiQiangState(room, player, true);
            break;

        case this.ACTION.UNSET_SHIQIANG:
            // 十三幺可拾抢(关闭)
            this.toggleShiQiangState(room, player, false);
            break;

        case this.ACTION.SHI:
            // 拾牌
            this.doShi(room, player, action.pai);
            break;

        case this.ACTION.QIANG:
            // 抢牌
            this.doQiang(room, player, action.pai);
            break;

        case this.ACTION.SHUAI_JIN:
            // 甩金
            this.doShuaiJin(room, player);
            break;
        case this.ACTION.VIEW_PAI:
            this.doViewPai(room, player);
            break;
    }
};

QinshuiGameModule.prototype.doViewPai = function(room, player) {
    var data = [];
    for(var i = 0; i < room.players.length; i++) {
        var tmp = {};
        tmp.id = i;
        tmp.holds = room.players[i].holds;
        tmp.tingpais = room.players[i].ting_map;
        data.push(tmp);
    }
    room.sendMsg(player.id, CONST.PUSH.VIP_VIEW_PAI_PUSH , data);
};

/**
 * 切换可拾抢状态
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param is_on: 是否开启
 */
QinshuiGameModule.prototype.toggleShiQiangState = function(room, player, is_on) {
    if (player.has_decided_shiqiang) {
        // 已经决定过, 不能再决定
        return;
    }

    player.can_shiqiang = is_on;

    // 已经决定了
    player.has_decided_shiqiang = true;

    // 广播给玩家
    room.pushMessage(CONST.PUSH.PLAYER_SHIQIANG_PUSH, {
        player_index: player.index,
        can_shiqiang: player.can_shiqiang
    });
};

/**
 * 玩家拾牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pai: 拾的牌
 */
QinshuiGameModule.prototype.doShi = function(room, player, pai) {
    if (! player.can_shi) {
        return;
    }

    if (player.has_qiang) {
        // 已经抢过一次
        return;
    }

    // 如果有人可以吃碰杠胡, 则等待
    for (var i = 0; i < room.player_count; i++) {
        var other_player = room.players[i];
        if (other_player.index === player.index) {
            continue;
        }

        if (other_player.can_hu || other_player.can_qiang) {
            return;
        }
    }

    // 清理所有等待操作
    this.clearAllOptions(room);

    // 添加到拾抢牌
    player.shi_qiangs.push(pai);

    if (room.qianggang_shiqiang) {
        var gang_pai = room.qianggang_shiqiang.pai;
        var gang_player = room.players[room.qianggang_shiqiang.index];

        // 杠牌玩家那里删除杠的牌
        for (i = 0; i < 4; i++) {
            var index = gang_player.holds.indexOf(gang_pai);
            if (index !== -1) {
                gang_player.holds.splice(index, 1);
                gang_player.count_map[gang_pai]--;
            }
        }

        // 刷新杠牌玩家手牌
        room.sendMsg(gang_player.id, CONST.PUSH.PLAYER_HOLDS_PUSH, gang_player.holds);
        // 给其他玩家通知手牌(-1)
        var holds = [];
        for (var j = 0; j < gang_player.holds.length; j++) {
            holds.push(-1);
        }
        room.pushMessage(CONST.PUSH.SPECTATOR_HOLDS_PUSH, {
            holds: holds,
            player_index: gang_player.index
        }, gang_player.id);

        // 解除【拾抢被抢杠】标记
        room.qianggang_shiqiang = null;
    } else {
        // 撤销轮子玩家的folds
        this.undoTurnFolds(room);
    }

    // 做记录
    this.recordGameAction(room, player.index, this.ACTION.SHI, pai);

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.SHI,
        pai: pai
    });

    // 轮到拾牌玩家
    this.moveToNextUser(room, player.index);

    // 让玩家操作
    this.doUserTurn(room);
};

/**
 * 玩家抢牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pai: 抢的牌
 */
QinshuiGameModule.prototype.doQiang = function(room, player, pai) {
    if (! player.can_qiang) {
        return;
    }

    if (player.has_qiang) {
        // 已经抢过一次
        return;
    }

    // 如果有人可以胡, 则等待
    for (var i = 0; i < room.player_count; i++) {
        var other_player = room.players[i];
        if (other_player.index === player.index) {
            continue;
        }

        if (other_player.can_hu) {
            return;
        }
    }

    // 清理所有等待操作
    this.clearAllOptions(room);

    // 添加到拾抢牌
    player.shi_qiangs.push(pai);

    // 已经抢过一次
    player.has_qiang = true;

    if (room.qianggang_shiqiang) {
        var gang_pai = room.qianggang_shiqiang.pai;
        var gang_player = room.players[room.qianggang_shiqiang.index];

        // 杠牌玩家那里删除杠的牌
        for (i = 0; i < 4; i++) {
            var index = gang_player.holds.indexOf(gang_pai);
            if (index !== -1) {
                gang_player.holds.splice(index, 1);
                gang_player.count_map[gang_pai]--;
            }
        }

        // 刷新杠牌玩家手牌
        room.sendMsg(gang_player.id, CONST.PUSH.PLAYER_HOLDS_PUSH, gang_player.holds);
        // 给其他玩家通知手牌(-1)
        var holds = [];
        for (var j = 0; j < gang_player.holds.length; j++) {
            holds.push(-1);
        }
        room.pushMessage(CONST.PUSH.SPECTATOR_HOLDS_PUSH, {
            holds: holds,
            player_index: gang_player.index
        }, gang_player.id);

        // 解除【拾抢被抢杠】标记
        room.qianggang_shiqiang = null;
    } else {
        // 撤销轮子玩家的folds
        this.undoTurnFolds(room);
    }

    // 做记录
    this.recordGameAction(room, player.index, this.ACTION.QIANG, pai);

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.QIANG,
        pai: pai
    });

    // 轮到拾牌玩家
    this.moveToNextUser(room, player.index);

    // 让玩家操作
    this.doUserTurn(room);
};

/**
 * 甩金(逼金)
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.doShuaiJin = function(room, player) {
    if (! player.can_bijin) {
        return;
    }

    var pai = room.jin_pais[0];
    if (player.count_map[pai] === 0) {
        return;
    }

    // 手牌中删除
    var index = player.holds.indexOf(pai);
    player.holds.splice(index, 1);
    player.count_map[pai] --;

    // 重新排序
    mj_util.sort(player.holds, room.jin_pais);

    if (! player.is_ting) {
        // 准备可以胡的牌型
        this.prepareTingPais(room, player);
    }

    // 添加到jin_folds
    player.jin_folds.push(pai);

    // 清理所有等待操作
    this.clearAllOptions(room);

    // 做记录
    this.recordGameAction(room, player.index, this.ACTION.CHU_PAI, pai);

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.CHU_PAI,
        pai: pai
    });

    var self = this;
    room.waiting_action = {
        timeout: true,
        remain_time: this.SPAN.AUTO_CHU_PAI,
        handler: function() {
            room.chu_pai = -1;

            // 下一家发牌，并通知他出牌
            self.moveToNextUser(room);
            self.doMoPai(room);
        }
    };
};

/**
 * 玩家吃牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pais: 吃的牌组
 *  0: n, n+1, n+2
 *  1: n-1, n, n+1
 *  2: n-2, n-1, n
 */
QinshuiGameModule.prototype.doChi = function(room, player, pais) {
    if (player.can_chi === false) {
        return;
    }

    var index = -1;
    for (var i = 0; i < pais.length; i++) {
        pais[i] = parseInt(pais[i]);

        if (pais[i] === room.chu_pai) {
            index = i;
        }
    }
    if (index === -1) {
        return;
    }

    var second_pai, third_pai;
    if (index === 0) {
        second_pai = pais[1];
        third_pai = pais[2];
    } else if (index === 1) {
        second_pai = pais[0];
        third_pai = pais[2];
    } else if (index === 2) {
        second_pai = pais[0];
        third_pai = pais[1];
    }
    if (! (player.count_map[second_pai] > 0 && player.count_map[third_pai] > 0)) {
        return;
    }

    // 如果有人可以碰/杠/胡, 则等待
    for (i = 0; i < room.player_count; i++) {
        var other_player = room.players[i];
        if (other_player.index === player.index) {
            continue;
        }

        if (other_player.can_hu || other_player.can_gang || other_player.can_peng || other_player.can_shi || other_player.can_qiang) {
            return;
        }
    }

    // 清理所有等待操作
    this.clearAllOptions(room);

    // 调整顺序, 吃的牌放到最前面
    pais = [
        room.chu_pai,
        second_pai,
        third_pai
    ];

    // 从手牌删除吃的牌
    for (i = 0; i < 3; i++) {
        var pai = pais[i];

        if (pai === room.chu_pai) {
            continue;
        }

        index = player.holds.indexOf(pai);
        player.holds.splice(index, 1);
        player.count_map[pai]--;
    }

    // 添加到吃牌
    player.chis.push(pais);

    // 撤销轮子玩家的folds
    this.undoTurnFolds(room);

    // 做记录
    this.recordGameAction(room, player.index, this.ACTION.CHI, pais);

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.CHI,
        pais: pais
    });

    // 轮到吃牌玩家
    this.moveToNextUser(room, player.index);

    // 让玩家操作
    this.doUserTurn(room);
};

/**
 * 玩家碰牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.doPeng = function (room, player) {
    // 如果有人可以吃碰杠胡, 则等待
    for (var i = 0; i < room.player_count; i++) {
        var other_player = room.players[i];
        if (other_player.index === player.index) {
            continue;
        }
        if (other_player.can_hu || other_player.can_qiang || other_player.can_shi || other_player.can_gang) {
            return;
        }
    }
    MahjongGameModule.prototype.doPeng.call(this, room, player);
};

/**
 * 玩家杠牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pai: 要杠的牌
 */
QinshuiGameModule.prototype.doGang = function (room, player, pais, gang_type) {
    var pai = parseInt(pais);
    /*switch (gang_type) {
        case mj_util.GANG_TYPE.XUANFENG_GANG:
        case mj_util.GANG_TYPE.XI_GANG:
            this._doGang(room, player, pai, pais, gang_type);
            break;
    }*/

    if (player.can_gang === false) {
        return;
    }

    /*if (player.gang_pais.indexOf(pai) === -1) {
        return;
    }*/

    // 如果有人可以拾抢胡, 则等待
    var i, other_player;
    for (i = 0; i < room.player_count; i++) {
        other_player = room.players[i];
        if (other_player.index === player.index) {
            continue;
        }

        if (other_player.can_hu || other_player.can_qiang || other_player.can_shi) {
            return;
        }
    }

    // 清理所有等待操作
    this.clearAllOptions(room);

    // 通知给大家有人【杠】（只是动画+音效）
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        type: this.ACTION.HANGANG,
        player_index: player.index
    });

    var count = player.count_map[pai];

    if (count === 1 || count === 3) {
        //Check Peng
        if(gang_type === mj_util.GANG_TYPE.BU_GANG) {
            var can_qiangpeng = this.checkCanQiangPeng(room, player, pai);
            if(can_qiangpeng) {
                return;
            }
        }
    }

    this._doGang(room, player, pai, pais, gang_type);
};

/**
 * 玩家杠牌（实际操作）
 *
 * @param room
 * @param player
 * @param pai
 * @private
 */
QinshuiGameModule.prototype._doGang = function(room, player, pai, pais, gang_type) {
    var count = player.count_map[pai];
    var gang_type;

    switch (gang_type) {
        case mj_util.GANG_TYPE.PENG_GANG: // 碰杠
            gang_type = mj_util.GANG_TYPE.PENG_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        case mj_util.GANG_TYPE.MING_GANG: // 明杠
            gang_type = mj_util.GANG_TYPE.MING_GANG;
            this.recordGangScore(room, player, gang_type, room.turn);
            break;
        case mj_util.GANG_TYPE.AN_GANG: // 暗杠
            gang_type = mj_util.GANG_TYPE.AN_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        case mj_util.GANG_TYPE.XUANFENG_GANG:
            gang_type = mj_util.GANG_TYPE.XUANFENG_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        case mj_util.GANG_TYPE.XI_GANG:
            gang_type = mj_util.GANG_TYPE.XI_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        case mj_util.GANG_TYPE.YAO_GANG:
            gang_type = mj_util.GANG_TYPE.YAO_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        case mj_util.GANG_TYPE.JIU_GANG:
            gang_type = mj_util.GANG_TYPE.JIU_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        case mj_util.GANG_TYPE.BU_GANG:
            gang_type = mj_util.GANG_TYPE.BU_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            count = 1;
            break;
        default:
            return;
    }

    // 从手牌中删除
    var i, index;
    if(gang_type === mj_util.GANG_TYPE.XUANFENG_GANG || gang_type === mj_util.GANG_TYPE.XI_GANG ||
        gang_type === mj_util.GANG_TYPE.YAO_GANG || gang_type === mj_util.GANG_TYPE.JIU_GANG) {
        for(i = 0; i < pais.length; i++) {
            var card = pais[i];
            index = player.holds.indexOf(card);
            player.holds.splice(index, 1);
            player.count_map[card]--;
        }
    } else {
        for (i = 0; i < count; i++) {
            index = player.holds.indexOf(pai);
            player.holds.splice(index, 1);
            player.count_map[pai]--;
        }
    }

    // 添加到杠
    switch (gang_type) {
        case mj_util.GANG_TYPE.PENG_GANG:
            // 碰杠
            player.peng_gangs.push(pai);
            // 需要删除碰
            if (gang_type === mj_util.GANG_TYPE.PENG_GANG) {
                index = player.pengs.indexOf(pai);
                player.pengs.splice(index, 1);
            }
            break;
        case mj_util.GANG_TYPE.MING_GANG:
            // 明杠
            player.ming_gangs.push(pai);
            break;
        case mj_util.GANG_TYPE.AN_GANG:
            // 暗杠
            player.an_gangs.push(pai);
            break;
        case mj_util.GANG_TYPE.XUANFENG_GANG:
            for (i = 0;i < pais.length; i++)
                player.xuanfeng_gangs.push(pais[i]);
            break;
        case mj_util.GANG_TYPE.XI_GANG:
            for (i = 0;i < pais.length; i++)
                player.xi_gangs.push(pais[i]);
            break;
        case mj_util.GANG_TYPE.YAO_GANG:
            for (i = 0;i < pais.length; i++)
                player.yao_gangs.push(pais[i]);
            break;
        case mj_util.GANG_TYPE.JIU_GANG:
            for (i = 0;i < pais.length; i++)
                player.jiu_gangs.push(pais[i]);
            break;
        case mj_util.GANG_TYPE.BU_GANG:
            if(player.xuanfeng_gangs.length > 0 && mj_util.isFengPai(pai)) {
                player.xuanfeng_gangs.push(pai);
                break;
            }
            if(player.xi_gangs.length > 0 && mj_util.isXiPai(pai)) {
                player.xi_gangs.push(pai);
                break;
            }
            if(player.yao_gangs.length > 0 && mj_util.isYaoPai(pai)) {
                player.yao_gangs.push(pai);
                break;
            }
            if(player.jiu_gangs.length > 0 && mj_util.isJiuPai(pai)) {
                player.jiu_gangs.push(pai);
                break;
            }
            break;
    }

    // 准备听牌列表
    this.prepareTingPais(room, player);

    // 撤销轮子出的牌
    this.undoTurnFolds(room);

    // 做记录
    switch (gang_type) {
        case mj_util.GANG_TYPE.PENG_GANG:
            this.recordGameAction(room, player.index, this.ACTION.GANG, pai);
            break;
        case mj_util.GANG_TYPE.MING_GANG:
            this.recordGameAction(room, player.index, this.ACTION.GANG, pai);
            break;
        case mj_util.GANG_TYPE.AN_GANG:
            this.recordGameAction(room, player.index, this.ACTION.GANG, pai);
            break;
        case mj_util.GANG_TYPE.XUANFENG_GANG:
            this.recordGameAction(room, player.index, this.ACTION.XUANFENG_GANG, pais);
            break;
        case mj_util.GANG_TYPE.XI_GANG:
            this.recordGameAction(room, player.index, this.ACTION.XI_GANG, pais);
            break;
        case mj_util.GANG_TYPE.YAO_GANG:
            this.recordGameAction(room, player.index, this.ACTION.YAO_GANG, pais);
            break;
        case mj_util.GANG_TYPE.JIU_GANG:
            this.recordGameAction(room, player.index, this.ACTION.JIU_GANG, pais);
            break;
        case mj_util.GANG_TYPE.BU_GANG:
            this.recordGameAction(room, player.index, this.ACTION.BU_GANG, pais);
            break;
    }


    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.GANG,
        data: {
            type: gang_type,
            pai: pais
        }
    });

    // 轮到杠牌玩家
    this.moveToNextUser(room, player.index);

    if(gang_type === mj_util.GANG_TYPE.PENG_GANG ||
        gang_type === mj_util.GANG_TYPE.MING_GANG ||
        gang_type === mj_util.GANG_TYPE.AN_GANG ||
        gang_type === mj_util.GANG_TYPE.BU_GANG ) {
        // 让他摸牌
        this.doMoPai(room);
    } else {
        // 让玩家操作
        this.doUserTurn(room);
    }
};

/**
 * 玩家听牌
 *
 * @param room
 * @param player
 * @param pai
 */
QinshuiGameModule.prototype.doTing = function(room, player, pai) {
    MahjongGameModule.prototype.doTing.call(this, room, player, pai);
};

/**
 * 玩家胡牌
 *
 * @param room
 * @param player
 */
QinshuiGameModule.prototype.doHu = function(room, player) {
    MahjongGameModule.prototype.doHu.call(this, room, player);

    // 【沁水】听之后才可以胡
    if (! player.is_ting) {
        return;
    }

    if (player.can_hu === false) {
        return;
    }

    var pai;

    if (room.qianggang_context != null) {
        // 抢杠胡
        if (room.qianggang_context.is_valid === true) {
            // 记录被抢杠的玩家
            room.loser_index = room.qianggang_context.player.index;
            pai = room.qianggang_context.pai;

            // 抢杠胡不再有效
            room.qianggang_context.is_valid = false;
        }
    } else {
        // 自摸
        pai = room.chu_pai;
    }

    // 标记为胡
    player.is_hued = true;

    // 做记录
    this.recordGameAction(room, player.index, this.ACTION.HU, pai);

    // 清理所有等待记录
    this.clearAllOptions(room);

    // 不能再出牌
    player.can_chu_pai = false;

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.HU,
        pai: pai
    });

    // 回合结束
    this.delayRoundOver(room);
};

/**
 * 玩家过牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
QinshuiGameModule.prototype.doGuo = function(room, player) {
    MahjongGameModule.prototype.doGuo.call(this, room, player);

    if (this.hasOperations(player) === false) {
        return;
    }

    if (player.is_ting && player.can_hu) {
        // 【听牌】, 遇到胡必须胡
        return;
    }

    if (player.can_ting) {
        console.log('房间【', room.id, ' 第', room.round_no ,'回合 俱乐部: ', room.club_id,'】的玩家【', player.id , ' ', player.base_info.name, '】可以报听，不过他决定【过】, 手牌是: ', player.holds);
    }
    if (player.is_ting && player.can_gang) {
        console.log('房间【', room.id, ' 第', room.round_no ,'回合 俱乐部: ', room.club_id,'】的玩家【', player.id , ' ', player.base_info.name, '】已经听牌，可以杠牌，不过他决定【过】, 手牌是: ', player.holds);
    }

    // 通知给自己(需要隐藏客户端的操作面板)
    room.sendMsg(player.id, CONST.PUSH.PLAYER_GUO_RESULT_PUSH);

    // 清理玩家的记录
    this.clearAllOptions(room, player);

    // 如果是玩家的轮子, 不需要额外操作(i.e. 碰杠, 暗杠)
    var do_nothing = (room.chu_pai === -1) && (room.turn === player.index);
    if (do_nothing) {
        if (player.is_ting) {
            // 报听, 直接出牌(最后一张)
            var self = this;
            room.waiting_action = {
                timeout: true,
                remain_time: this.SPAN.AUTO_CHU_PAI,
                handler: function () {
                    // 用户可以出牌
                    player.can_chu_pai = true;
                    self.doChuPai(room, player, player.holds[player.holds.length - 1]);
                }
            };
        }

        return;
    }

    // 如果其他人还可以操作
    for (var i = 0; i < room.player_count; i++) {
        if (this.hasOperations(room.players[i])) {
            this.sendOperations(room, room.players[i], room.chu_pai);
            return;
        }
    }

    if (room.qianggang_shiqiang) {
        var gang_player_index = room.qianggang_shiqiang.index;
        var gang_pai = room.qianggang_shiqiang.pai;

        // 可以杠牌
        this._doGang(room, room.players[gang_player_index], gang_pai);

        // 解除【拾抢被抢杠】标记
        room.qianggang_shiqiang = null;
        return;
    }

    if(room.qiangpeng_context != null && room.qiangpeng_context.is_valid) {
        this._doGang(room, room.qiangpeng_context.player, room.qiangpeng_context.pai, [room.qiangpeng_context.pai], mj_util.GANG_TYPE.BU_GANG);
        return;
    } else {
        // 下家摸牌
        this.moveToNextUser(room);

        // 让他摸牌
        this.doMoPai(room);
        return;
    }

    if (room.qianggang_context != null && room.qianggang_context.is_valid) {
        this._doGang(room, room.qianggang_context.player, room.qianggang_context.pai);
    } else {
        // 下家摸牌
        this.moveToNextUser(room);

        // 让他摸牌
        this.doMoPai(room);
    }
};

/**
 * 玩家出牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pai: 出的牌
 */
QinshuiGameModule.prototype.doChuPai = function(room, player, pai) {
    MahjongGameModule.prototype.doChuPai.call(this, room, player, pai);

    pai = parseInt(pai);
    if (player.index !== room.turn) {
        return;
    }

    if (player.can_chu_pai === false) {
        return;
    }

    if (this.hasOperations(player) && ! player.can_ting) {
        return;
    }

    var index = player.holds.indexOf(pai);
    if (index === -1) {
        return;
    }

    // 第四个金牌不能打出去
    if (room.jin_pais.indexOf(pai) !== -1) {
        if (player.jin_folds.length === 3) {
            return;
        }
    }

    // 如果在玩十三幺, 要等所有人做决定在操作
    if (room.settings.has_shiqiang) {
        var flag = true;
        for (i = 0; i < room.player_count; i++) {
            if (! room.players[i].has_decided_shiqiang) {
                flag = false;
                break;
            }
        }

        if (flag === false) {
            return;
        }
    }

    player.can_chu_pai = false;
    player.first_time = false;

    // 从手牌中删除
    player.holds.splice(index, 1);
    player.count_map[pai] --;

    // 重新排序
    mj_util.sort(player.holds, room.jin_pais);

    // 刷新当前出的牌
    room.chu_pai = pai;

    if (player.can_ting) {
        // 通知给自己(需要隐藏客户端的操作面板)
        room.sendMsg(player.id, CONST.PUSH.PLAYER_GUO_RESULT_PUSH);
    }

    // 清理玩家的记录
    this.clearAllOptions(room, player);

    // 记录动作
    this.recordGameAction(room, player.index, this.ACTION.CHU_PAI, pai);

    if (! player.is_ting) {
        // 准备可以胡的牌型
        this.prepareTingPais(room, player);
    }

    if (room.jin_pais.indexOf(room.chu_pai) !== -1) {
        // 玩家出了金牌
        player.jin_folds.push(room.chu_pai);
    } else {
        // 玩家出了其他牌
        player.folds.push(room.chu_pai);
    }

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.CHU_PAI,
        pai: pai
    });

    // 检查是否有人要吃, 碰, 杠
    var has_actions = false;
    if (room.jin_pais.indexOf(pai) === -1) {
        // 金牌不能吃碰杠胡
        var need_check_hu = true;
        for (var i = 0; i < room.player_count; i++) {
            // 从轮子下一家开始扫描
            var other_player = room.players[(i + room.turn) % room.player_count];
            // 玩家自己不检查
            if (room.turn === other_player.index) {
                continue;
            }

            var max_jin_folds = this.getMaxJinFold(room);

            if (other_player.is_ting) {
                if (other_player.jin_folds.length < max_jin_folds && room.settings.has_shaojin_zimo) {
                    // 上金少者只能自摸
                } else {
                    // 遇到胡必须胡 + 顺序从下一家开始 + 没有一炮多响
                    if (need_check_hu) {
                        this.checkCanHu(room, other_player, pai);

                        if (other_player.can_hu) {
                            need_check_hu = false;
                        }
                    }
                }
            } else {
                if (! other_player.can_shiqiang) {
                    if (! room.settings.has_no_chi) {
                        // 听牌玩家不检查吃
                        this.checkCanChi(room, other_player, pai);
                    }

                    // 听牌玩家不检查碰
                    this.checkCanPeng(room, other_player, pai);
                } else {
                    if (mj_util.isYaoPai(pai) && ! mj_util.isJinPai(room.jin_pais, pai)) {
                        // 检查拾/抢牌
                        this.checkCanShiQiang(room, other_player, pai);
                    }
                }
            }
            // 听牌之后也可以杠, 只要保持听状态(改变听口无所谓)
            this.checkCanMingGang(room, other_player, pai);

            if (this.hasOperations(other_player)) {
                this.sendOperations(room, other_player, room.chu_pai);
                has_actions = true;
            }
        }
    }
    if (! has_actions) {
        // 广播给大家
        /*room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
            player_index: player.index,
            type: this.ACTION.GUO,
            pai: room.chu_pai
        });*/

        room.chu_pai = -1;

        // 如果没有人有操作，则向下一家发牌，并通知他出牌
        this.moveToNextUser(room);
        this.doMoPai(room);
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏结算相关
//
//  jinScore:                       金分数
//
//  calculateRoundResult:           计算回合结果
//  prepareRoundResultData:         准备通知给客户端的回合信息
//  decideNextRoundButton:          决定下一局庄家
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 *  金分数(结算用到)
 *
 * @param room:     房间信息
 * @param player:   赢的玩家
 * @param is_pei_jin:  是否赔金
 * @returns {number}
 */
QinshuiGameModule.prototype.jinScore = function(room, player, is_pei_jin) {
    if (! player.is_ting && ! is_pei_jin) {
        return 0;
    }

    var scores = [];

    switch (room.settings.shuai_jin) {
        case this.CONSTANT.SHUAI_JIN.PINGJIA:
            if (room.settings.has_moshi && ! is_pei_jin) {
                // 成五摸拾
                scores = [0, 2, 4, 6];
            } else {
                scores = [0, 5, 10, 15];
            }
            break;
        case this.CONSTANT.SHUAI_JIN.JIABEI:
            if (room.settings.has_moshi && ! is_pei_jin) {
                // 成五摸拾
                scores = [0, 2, 4, 8];
            } else {
                scores = [0, 5, 15, 45];
            }
            break;
    }

    var index = UTIL.min(player.jin_folds.length, 3);

    return scores[index];
};

/**
 * 计算回合结果
 *
 * @param room: 房间信息
 */
/**
 * 计算回合结果
 *
 * @param room: 房间信息
 */
QinshuiGameModule.prototype.calculateRoundResult = function(room) {
    var self = this;
    // 本回合分数都保存到这儿
    var results = [];

    // 计算翻番
    var calculateFanFan = function(winner_player, pai) {
        winner_player.fan = winner_player.ting_map[pai].fan;
        winner_player.patterns.push(winner_player.ting_map[pai].hu_pattern);

        // 翻番
        if (mj_util.isQiDui(winner_player.count_map, [], 0)) {
            if (mj_util.isHaohuaQiDui(winner_player.count_map, 0)) {
                // 豪华七小对
                winner_player.patterns.push(self.PATTERN.HAOHUA_QIXIAODUI);
                winner_player.fan = 16;
            } else {
                // 七小对
                winner_player.patterns.push(self.PATTERN.QIXIAODUI);
                winner_player.fan = 8;
            }
        }

        if(room.settings.has_daiquemen === true) {
            if (mj_util.isQingYiSe(winner_player, [])) {
                // 清一色
                winner_player.patterns.push(self.PATTERN.QINGYISE);
                winner_player.fan = winner_player.fan * 2;
            }
        }
    };

    // 计算分数(胡牌分数 - 自摸)
    var calculateZimoScore = function(winner_index) {
        var winner_player = room.players[winner_index];
        var fan = winner_player.fan;
        // 站立 翻倍
        if(winner_player.xuanfeng_gangs.length === 0 && winner_player.xi_gangs.length === 0 && winner_player.yao_gangs.length === 0 && winner_player.jiu_gangs.length === 0)
            fan = fan * 2;

        if(room.next_button === winner_index)
            fan = fan * 2;

        // 计算【赢家/输家】的分数
        var fanbei = 1;
        for (var j = 0; j < room.player_count; j++) {
            var player = room.players[j];
            if (player.index === winner_index) {
                continue;
            }
            fanbei = 1;
            if(player.index === room.next_button) {
                fanbei = 2;
            }

            // 自摸, 要扣取所有玩家
            results[player.index].fan_score -= fanbei * winner_player.fan;
            results[winner_index].fan_score += fanbei * winner_player.fan;
        }
    };

    // 计算分数(胡牌分数 - 抢杠胡)
    var calculateQiangGangScore = function(winner_indices, loser_index) {
        // 抢杠算点炮
        calculateDianPaoScore(winner_indices, loser_index);
    };

    // 计算分数(胡牌分数 - 点炮)
    var calculateDianPaoScore = function(winner_indices, loser_index) {
        for (var i = 0; i < winner_indices.length; i++) {
            var winner_index = winner_indices[i];
            var winner_player = room.players[winner_index];
            var loser_player = room.players[loser_index];

            var fan = winner_player.fan;

            var fanbei;
            for (var j = 0; j < room.player_count; j++) {
                var player = room.players[j];
                results[player.index].fan_score = 0;
                //庄家不管输赢都得翻倍
                fanbei = 1;
                if(player.index === room.next_button) {
                    fanbei = 2;
                }
                //赢家不扣分
                if (player.index === winner_index) {
                    continue;
                }
                //点炮的玩家翻倍
                if(player.index === loser_index) {
                    results[player.index].fan_score -= fanbei * 2 * winner_player.fan;
                    continue;
                }
                //其他玩家扣fan
                results[player.index].fan_score -= fanbei * winner_player.fan;
            }

            // 计算赢家番数，其他三个玩家的番数之和
            for (var j = 0; j < room.player_count; j++) {
                var player = room.players[j];
                if (player.index === winner_index) {
                    continue;
                }
                results[winner_index].fan_score += -1 * results[player.index].fan_score;
            }

            // 如果是勾选了点炮包三家，而且点炮的人是听牌状态的话，按照上面的来做，其他情况点炮人承担所有责任
            if (room.settings.has_dianpaosanjia === true && loser_player.is_ting) {
                // 点炮三家付
            } else {
                // 点炮玩家承担所有责任
                for (var j = 0; j < room.player_count; j++) {
                    var player = room.players[j];
                    if (player.index === winner_index) {
                        continue;
                    }
                    if(player.index === loser_index)
                    {
                        results[loser_player.index].fan_score = -1 * results[winner_index].fan_score;
                        continue;
                    }
                    results[player.index].fan_score = 0;
                }
            }

            // 站立 翻倍
            fan = 1;
            if(winner_player.xuanfeng_gangs.length === 0 && winner_player.xi_gangs.length === 0 && winner_player.yao_gangs.length === 0 && winner_player.jiu_gangs.length === 0) {
                fan = fan * 2;
                room.players[winner_index].patterns.push(self.PATTERN.ZHANLI);
            }
            // 庄家 翻倍
            if(room.next_button === winner_index)
                fan = fan * 2;

            for (var j = 0; j < room.player_count; j++) {
                var player = room.players[j];
                results[player.index].fan_score = fan * results[player.index].fan_score;
            }
        }
    };

    // 点炮牌计数要算进去(判断特殊牌型用到)
    var appendCountMap = function(winner_player, pai) {
        if (! winner_player.count_map[pai]) {
            winner_player.count_map[pai] = 1;
        } else {
            winner_player.count_map[pai] ++;
        }
    };

    var i, player;
    for (i = 0; i < room.player_count; i++) {
        player = room.players[i];

        results[i] = {};
        results[i].score = 0;
        results[i].gang_score = 0;
        results[i].fan_score = 0;
        results[i].num_zimo = 0;
        results[i].num_dianpaohu = 0;
        results[i].num_dianpao = 0;
        results[i].num_shangjiajiechu = 0;
        results[i].num_peijin = 0;
        results[i].num_qianggang = 0;
        results[i].num_beiqianggang = 0;
        results[i].num_minggang = player.ming_gangs.length;
        results[i].num_angang = player.an_gangs.length;
        results[i].num_penggang = player.peng_gangs.length;
        results[i].hued = player.is_hued;
        results[i].is_ting = player.is_ting;
    }

    // 找到所有赢家位置
    var winner_indices = [];
    for (i = 0; i < room.player_count; i++) {
        player = room.players[i];

        if (player.is_hued) {
            winner_indices.push(i);
        }
    }

    // 先计算杠分
    for (i = 0; i < room.player_count; i++) {
        // player是收杠钱的玩家
        player = room.players[i]

        for (var j = 0; j < player.gang_actions.length; j++) {
            var action = player.gang_actions[j];

            for (var ii = 0; ii < action.targets.length; ii++) {
                results[action.targets[ii]].gang_score -= action.score;
                results[i].gang_score += action.score;
            }
        }
    }

    if (winner_indices.length === 0) {
        return results;
    }

    // 计算胡牌分数
    var winner_index;
    if (room.chu_pai !== -1) {
        // 点炮胡
        var loser_index = room.turn;
        // 统计信息
        for (i = 0; i < winner_indices.length; i++) {
            winner_index = winner_indices[i];
            results[winner_index].num_dianpaohu++;
            results[loser_index].num_dianpao++;

            // 玩家的Pattern情况
            //room.players[winner_index].patterns.push(this.PATTERN.DIANPAO_HU);
            room.players[loser_index].patterns.push(this.PATTERN.DIANPAO);

            // 计算翻番
            // 点炮牌要算进去
            appendCountMap(room.players[winner_index], room.chu_pai);
            calculateFanFan(room.players[winner_index], room.chu_pai);
        }

        // 分数计算(点炮)
        calculateDianPaoScore(winner_indices, loser_index);
    } else {
        // 抢杠胡 + 自摸
        if (room.qianggang_context != null && room.loser_index >= 0) {
            // 抢杠胡
            // 统计信息
            for (i = 0; i < winner_indices.length; i++) {
                winner_index = winner_indices[i];
                results[winner_index].num_qianggang++;
                results[room.loser_index].num_beiqianggang++;

                // 玩家的Pattern情况
                //room.players[winner_index].patterns.push(this.PATTERN.QIANGGANG_HU);
                room.players[room.loser_index].patterns.push(this.PATTERN.BEI_QIANGGANG);

                // 计算翻番
                // 点炮牌要算进去
                appendCountMap(room.players[winner_index], room.qianggang_context.pai);
                calculateFanFan(room.players[winner_index], room.qianggang_context.pai);
            }

            // 分数计算(抢杠胡)
            calculateQiangGangScore(winner_indices, room.loser_index);
        } else {
            // 自摸
            winner_index = winner_indices[0];
            // 统计信息
            results[winner_index].num_zimo++;
            // 玩家的Pattern情况
            //room.players[winner_index].patterns.push(this.PATTERN.ZIMO);
            // 计算翻番
            calculateFanFan(room.players[winner_index], room.players[winner_index].holds[room.players[winner_index].holds.length - 1]);
            // 分数计算(自摸)
            calculateZimoScore(winner_index);
        }
    }

    for(var i = 0; i < room.player_count; i++) {
        var player = room.players[i];
        results[player.index].score = results[player.index].fan_score + results[player.index].gang_score;
    }


    return results;
};
/**
 * 准备通知给客户端的回合信息
 *
 * @param room: 房间信息
 * @param round_results: 回合结果
 */
QinshuiGameModule.prototype.prepareRoundResultData = function(room, round_results) {
    var result_data = MahjongGameModule.prototype.prepareRoundResultData.call(this, room, round_results);

    // 插入拾抢信息
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        result_data[i].shi_qiangs = player.shi_qiangs;
    }

    return result_data;
};

/**
 * 决定下一局庄家
 *
 * @param room: 房间信息
 */
QinshuiGameModule.prototype.decideNextRoundButton = function(room) {
    // 【沁水】庄家胡牌, 继续坐庄. 闲家胡牌, 下一家坐庄
    var winner_index = -1;
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        if (player.is_hued) {
            winner_index = player.index;
            break;
        }
    }

    if (winner_index >= 0) {
        // 自摸 + 胡牌
        if (room.button === winner_index) {
            // 庄家胡牌
            room.next_button = winner_index;
        } else {
            // 闲家胡牌
            room.next_button = (room.button + 1) % room.player_count;
        }
    } else {
        // 黄庄, 继续坐庄
        room.next_button = room.button;
    }
};


module.exports = new QinshuiGameModule();