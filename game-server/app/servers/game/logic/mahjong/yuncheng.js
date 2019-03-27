/**
 * Created by leo on 3/13/2018.
 */

var mj_util = require('./mj_util');
var MahjongGameModule = require('./mahjong');

function YunchengGameModule() {
    MahjongGameModule.call(this);

    // -- 运城贴金 --
    // 金数
    this.CONSTANT.JIN_COUNT = {
        FOUR: 4,
        EIGHT: 8
    };
    // 金分倍数
    this.CONSTANT.JIN_BEI = {
        PINGJIA: 'pingjia',                                                                                             //  平加
        JIABEI: 'jiabei',                                                                                               //  加倍
        SANBEI: 'sanbei'                                                                                                //  三倍
    };
}

YunchengGameModule.prototype = new MahjongGameModule();
YunchengGameModule.prototype.constructor = YunchengGameModule;

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
     *      type    房间类型(私人房间/俱乐部)
     *      club_id (optional)  俱乐部ID
     *      settings 创建选项
     *          jin_count   金数
     *          jin_bei     金分倍数
     *
     *          has_shaojin_zimo 上金少者只能自摸(可选)
     *          has_qixiaodui 七小对(可选)
     *          has_yitiaolong 一条龙(可选)
     *          has_qingyise 清一色(可选)
     *          has_shisanyao 十三幺(可选)
     * @param callback
     * @returns {*}
     */
YunchengGameModule.prototype.canCreateRoom = function(user, conf, callback) {
    var self = this;

    MahjongGameModule.prototype.canCreateRoom.call(this, user, conf, function(err) {
        if (err) {
            return callback(err);
        }

        var type = conf.type;
        var settings = conf.settings;

        var fee_method = settings.fee_method;                                                                           //  房费
        var needed_gems;
        var club_creator_id = null;

        var doCheck = function() {
            var jin_count = parseInt(settings.jin_count);                                                                   //  金数
            var jin_bei = settings.jin_bei;                                                                                 //  金分倍数

            // 1. 金数
            if (jin_count !== self.CONSTANT.JIN_COUNT.FOUR &&
                jin_count !== self.CONSTANT.JIN_COUNT.EIGHT) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 2. 贴金
            if (jin_bei !== self.CONSTANT.JIN_BEI.PINGJIA &&
                jin_bei !== self.CONSTANT.JIN_BEI.JIABEI &&
                jin_bei !== self.CONSTANT.JIN_BEI.SANBEI) {
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
                // 房主2个房卡
                needed_gems = 2;
            }
            if (user.gems < needed_gems) {
                return callback(ERROR.NOT_ENOUGH_GEMS);
            }

            // 接着检查
            doCheck();
        } else if (type === CONST.ROOM_TYPE.CLUB) {                                                                    //   俱乐部
            // 房主2个房卡
            needed_gems = 2;
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
                    club_creator_id = club.creator_id;

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
//  getMaxJinFold:          获取已打出的最大金牌数
//  getHoldJinCount:        获取手牌中金牌的数量
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取已打出的最大金牌数
 *
 * @param room: 房间信息
 * @returns {number}:   最大金牌数
 */
YunchengGameModule.prototype.getMaxJinFold = function(room) {
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
 * @param player:   玩家信息
 */
YunchengGameModule.prototype.getHoldJinCount = function(room, player) {
    var count = 0;
    for (var i = 0; i < room.jin_pais.length; i++) {
        if (player.count_map[room.jin_pais[i]] > 0) {
            count += player.count_map[room.jin_pais[i]];
        }
    }

    return count;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏相关
//
//  doRoundStart:               开始新的一局
//
//  chooseJinPai:               叫金
//
//  startZhuapai:               开始抓牌
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 开始新的一局
 *
 * @param room: 游戏房间
 */
YunchengGameModule.prototype.doRoundStart = function(room) {
    MahjongGameModule.prototype.doRoundStart.call(this, room);

    // 叫金
    this.chooseJinPai(room);
};

/**
 * 叫金
 *
 * @param room
 */
YunchengGameModule.prototype.chooseJinPai = function(room) {
    room.game_status = CONST.GAME_STATUS.JIAO_JIN;

    if (room.settings.jin_count === this.CONSTANT.JIN_COUNT.FOUR) {
        room.jin_pais = [UTIL.randomInt(0, this.used_pai_count)];
    } else if (room.settings.jin_count === this.CONSTANT.JIN_COUNT.EIGHT) {
        for (var i = 0; i < 2; i++) {
            var pai;
            // 发财不能是金
            do {
                pai = UTIL.randomInt(0, this.used_pai_count);
            } while (pai === 28 || room.jin_pais.indexOf(pai) !== -1);

            room.jin_pais.push(pai);
        }
    }

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

YunchengGameModule.prototype.testDeal = function(room) {
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

    // 七小对
    */
    player1.holds = [4, 5, 6, 7];
    player1.pengs = [3];

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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  手牌判断相关
//
//  filterGangs:                    过滤不可以杠的牌
//
//  checkCanMingGang:               是否可以明杠
//  checkCanAnGang:                 是否可以暗杠
//  checkCanPengGang:               是否可以碰杠
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
YunchengGameModule.prototype.filterGangPais = function(room, player) {
    if (! player.can_gang) {
        return;
    }

    if (! player.is_ting) {
        return;
    }

    // 听牌之后也可以杠牌, 前提是杠牌之后照样可以听牌
    var safe_gang_pais = [];
    for (var i = 0; i < player.gang_pais.length; i++) {
        var gang_pai = player.gang_pais[i];

        // 逐个检查是否为安全的杠牌
        var old_ting_map = UTIL.simple_clone(player.ting_map);

        if (JSON.stringify(old_ting_map) === '{}') {
            safe_gang_pais.push(gang_pai);
            continue;
        }

        var old_count = player.count_map[gang_pai];

        player.count_map[gang_pai] = 0;
        player.ting_map = {};
        mj_util.prepareYunChengTingPais(player, room.jin_pais, 0, this.used_pai_count - 1);

        console.log('玩家', player.index, '的old_ting_map', old_ting_map, '新的ting_map', player.ting_map);
        if (JSON.stringify(player.ting_map) !== '{}') {
            console.log('安全');
            // 安全
            safe_gang_pais.push(gang_pai);
        }

        player.count_map[gang_pai] = old_count;
        player.ting_map = old_ting_map;
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
YunchengGameModule.prototype.checkCanMingGang = function(room, player, target_pai) {
    MahjongGameModule.prototype.checkCanMingGang.call(this, room, player, target_pai);

    this.filterGangPais(room, player);
};

/**
 * 是否可以暗杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
YunchengGameModule.prototype.checkCanAnGang = function(room, player) {
    MahjongGameModule.prototype.checkCanAnGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以碰杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
YunchengGameModule.prototype.checkCanPengGang = function(room, player) {
    MahjongGameModule.prototype.checkCanPengGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以被抢杠
 *
 * @param room: 房间信息
 * @param gang_player: 杠牌的玩家
 * @param pai: 杠的牌
 */
YunchengGameModule.prototype.checkCanQiangGang = function(room, gang_player, pai) {
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
 * 准备可以胡的牌型(少一张, 用来判断, 如果要胡需要哪一张牌)
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
YunchengGameModule.prototype.prepareTingPais = function(room, player) {
    player.ting_map = {};
    player.fan = 0;

    // 检查是不是平胡
    mj_util.prepareYunChengTingPais(player, room.jin_pais, 0, this.used_pai_count - 1);

    MahjongGameModule.prototype.prepareTingPais.call(this, room, player);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家操作相关(1)
//
//  doUserTurn:                 轮到玩家, 让他来操作
//
//  doGang:                     玩家杠牌
//  doTing:                     玩家听牌
//  doHu:                       玩家胡牌
//  doGuo:                      玩家过牌
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 轮到玩家, 让他来操作
 *
 * @param room: 房间信息
 * @param did_mopai: 是否摸到了牌
 */
YunchengGameModule.prototype.doUserTurn = function(room, did_mopai) {
    MahjongGameModule.prototype.doUserTurn.call(this, room, did_mopai);

    var player = room.players[room.turn];

    // 检查能不能胡
    if (did_mopai === true) {
        // 检查碰杠
        this.checkCanPengGang(room, player);

        if (! player.is_ting) {
        } else {
            // 检查自摸, 用最后一张来检查
            this.checkCanHu(room, player, player.holds[player.holds.length - 1]);
        }
    }

    // 检查能不能暗杠
    this.checkCanAnGang(room, player);

    if (! player.is_ting) {
        // 检查能不能报听
        this.checkCanBaoTing(room, player);

        console.log()

        // 用户可以出牌
        player.can_chu_pai = true;

        // 用户可以操作
        this.sendOperations(room, player, room.chu_pai);
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
 * 玩家杠牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pai: 杠的牌
 */
YunchengGameModule.prototype.doGang = function(room, player, pai) {
    MahjongGameModule.prototype.doGang.call(this, room, player, pai);
};

/**
 * 玩家听牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pai: 杠的牌
 */
YunchengGameModule.prototype.doTing = function(room, player, pai) {
    MahjongGameModule.prototype.doTing.call(this, room, player, pai);
};

/**
 * 玩家胡牌
 *
 * @param room
 * @param player
 */
YunchengGameModule.prototype.doHu = function(room, player) {
    MahjongGameModule.prototype.doHu.call(this, room, player);

    // 【运城】听之后才可以胡
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
YunchengGameModule.prototype.doGuo = function(room, player) {
    MahjongGameModule.prototype.doGuo.call(this, room, player);

    if (this.hasOperations(player) === false) {
        return;
    }

    if (player.is_ting && player.can_hu) {
        // 【听牌】, 遇到胡必须胡
        return;
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
            return;
        }
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
YunchengGameModule.prototype.doChuPai = function(room, player, pai) {
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

    player.can_chu_pai = false;

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

    // 检查是否有人要碰, 要杠
    var has_actions = false;
    if (room.jin_pais.indexOf(pai) === -1) {
        // 金牌不能碰杠胡
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
                // 听牌玩家不检查碰
                this.checkCanPeng(room, other_player, pai);
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
 * @returns {number}
 */
YunchengGameModule.prototype.jinScore = function(room, player) {
    if (! player.is_ting) {
        return 0;
    }

    var scores = [];

    switch (room.settings.jin_bei) {
        case this.CONSTANT.JIN_BEI.PINGJIA:
            scores = [0, 3, 6, 9];
            break;
        case this.CONSTANT.JIN_BEI.JIABEI:
            scores = [0, 3, 6, 12];
            break;
        case this.CONSTANT.JIN_BEI.SANBEI:
            scores = [0, 3, 9, 27];
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
YunchengGameModule.prototype.calculateRoundResult = function(room) {
    // 本回合分数都保存到这儿
    var results = [];

    // 计算翻番
    var self = this;
    var calculateFanFan = function(winner_player) {
        // 翻番
        var jin_count = self.getHoldJinCount(room, winner_player);
        if (mj_util.isQiDui(winner_player.count_map, room.jin_pais, jin_count)) {
            // 七小对
            winner_player.patterns.push(self.PATTERN.QIXIAODUI);

            if (room.settings.has_qixiaodui) {
                winner_player.fan = 2;
            }
        }
        if (mj_util.isShiSanYao(winner_player.count_map, room.jin_pais, jin_count)) {
            // 十三幺
            winner_player.patterns.push(self.PATTERN.SHISANYAO);

            if (room.settings.has_shisanyao) {
                winner_player.fan = 2;
            }
        }
        if (mj_util.isQingYiSe(winner_player, room.jin_pais)) {
            // 清一色
            winner_player.patterns.push(self.PATTERN.QINGYISE);

            if (room.settings.has_qingyise) {
                winner_player.fan = 2;
            }
        }
        if (mj_util.isYiTiaoLong(winner_player, room.jin_pais, jin_count)) {
            // 一条龙
            winner_player.patterns.push(self.PATTERN.YITIAOLONG);

            if (room.settings.has_yitiaolong) {
                winner_player.fan = 2;
            }
        }

        if (winner_player.fan === 2) {
            winner_player.patterns.push(self.PATTERN.DAHU);
        } else {
            winner_player.fan = 1;
            winner_player.patterns.push(self.PATTERN.PINGHU);
        }
    };

    // 计算分数(胡牌分数 - 自摸)
    var calculateZimoScore = function(winner_index) {
        var winner_player = room.players[winner_index];
        // 计算【赢家/输家】的分数
        for (var j = 0; j < room.player_count; j++) {
            var player = room.players[j];

            if (player.index === winner_index) {
                continue;
            }

            // 明杠(1分)/暗杠(2分) + 自摸(2分) + 金分(3, 9, 27, 3金封顶)
            var jin_score = self.jinScore(room, winner_player);
            var zimo_score = 2;
            var loser_score = (zimo_score + jin_score) * winner_player.fan;

            // 自摸, 要扣取所有玩家
            results[player.index].score -= loser_score;
            results[winner_index].score += loser_score;
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

            var jin_score = self.jinScore(room, winner_player);
            var winner_score = 0;

            for (var j = 0; j < room.player_count; j++) {
                var player = room.players[j];
                if (player.index === winner_index) {
                    continue;
                }

                var hu_score = 1;
                var loser_score = (hu_score + jin_score) * winner_player.fan;
                winner_score += loser_score;

                if (loser_player.is_ting) {
                    // 听牌点炮, 三家付
                    results[player.index].score -= loser_score;
                }
            }

            if (! loser_player.is_ting) {
                results[loser_player.index].score -= winner_score;
            }
            results[winner_index].score += winner_score;
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
    }

    // 先计算杠分
    for (i = 0; i < room.player_count; i++) {
        // player是收杠钱的玩家
        player = room.players[i];

        for (var j = 0; j < player.gang_actions.length; j++) {
            var action = player.gang_actions[j];
            var score = action.score;

            for (var ii = 0; ii < action.targets.length; ii++) {
                results[action.targets[ii]].score -= score;
            }

            results[i].score += score * action.targets.length;
        }
    }

    // 找到所有赢家位置
    var winner_indices = [];
    for (i = 0; i < room.player_count; i++) {
        player = room.players[i];

        if (player.is_hued) {
            winner_indices.push(i);
        }
    }

    if (winner_indices.length === 0) {
        return results;
    }

    // 计算胡牌分数
    if (room.chu_pai !== -1) {
        // 点炮胡
        var loser_index = room.turn;
        // 统计信息
        for (i = 0; i < winner_indices.length; i++) {
            winner_index = winner_indices[i];
            results[winner_index].num_dianpaohu++;

            // 玩家的Pattern情况
            room.players[winner_index].patterns.push(this.PATTERN.DIANPAO_HU);
            if (room.players[loser_index].is_ting) {
                results[loser_index].num_shangjiajiechu++;
                room.players[loser_index].patterns.push(this.PATTERN.SHANGJIAJIECHU);
            } else {
                results[loser_index].num_dianpao++;
                room.players[loser_index].patterns.push(this.PATTERN.DIANPAO);
            }

            // 计算翻番
            // 点炮牌要算进去
            appendCountMap(room.players[winner_index], room.chu_pai);
            calculateFanFan(room.players[winner_index]);
        }

        // 分数计算(点炮)
        calculateDianPaoScore(winner_indices, loser_index);
    } else {
        // 抢杠胡 + 自摸
        var winner_index;
        if (room.qianggang_context != null && room.loser_index >= 0) {
            // 抢杠胡

            // 统计信息
            for (i = 0; i < winner_indices.length; i++) {
                winner_index = winner_indices[i];
                results[winner_index].num_qianggang++;

                // 玩家的Pattern情况
                room.players[winner_index].patterns.push(this.PATTERN.QIANGGANG_HU);
                if (room.players[room.loser_index].is_ting) {
                    results[room.loser_index].num_shangjiajiechu++;
                    room.players[room.loser_index].patterns.push(this.PATTERN.SHANGJIAJIECHU);
                } else {
                    results[room.loser_index].num_beiqianggang++;
                    room.players[room.loser_index].patterns.push(this.PATTERN.BEI_QIANGGANG);
                }

                // 计算翻番
                // 点炮牌要算进去
                appendCountMap(room.players[winner_index], room.qianggang_context.pai);
                calculateFanFan(room.players[winner_index]);
            }

            // 分数计算(抢杠胡)
            calculateQiangGangScore(winner_indices, room.loser_index);
        } else {
            // 自摸
            winner_index = winner_indices[0];
            // 统计信息
            results[winner_index].num_zimo++;

            // 玩家的Pattern情况
            room.players[winner_index].patterns.push(this.PATTERN.ZIMO);

            // 计算翻番
            calculateFanFan(room.players[winner_index]);

            // 分数计算(自摸)
            calculateZimoScore(winner_index);
        }
    }

    return results;
};

/**
 * 准备通知给客户端的回合信息
 *
 * @param room: 房间信息
 * @param round_results: 回合结果
 */
YunchengGameModule.prototype.prepareRoundResultData = function(room, round_results) {
    return MahjongGameModule.prototype.prepareRoundResultData.call(this, room, round_results);
};

/**
 * 决定下一局庄家
 *
 * @param room: 房间信息
 */
YunchengGameModule.prototype.decideNextRoundButton = function(room) {
    // 【运城】谁胡谁做庄
    var winner_index = -1;
    var i, player;
    if (room.loser_index === -1) {
        // 自摸 + 胡牌
        for (i = 0; i < room.player_count; i++) {
            player = room.players[i];

            if (player.is_hued) {
                winner_index = player.index;
                break;
            }
        }

        if (winner_index >= 0) {
            // 自摸 + 胡牌
            room.next_button = winner_index;
        } else {
            // 黄庄
            var has_gang = false;
            for (i = 0; i < room.player_count; i++) {
                player = room.players[i];

                if (player.ming_gangs.length + player.an_gangs.length + player.peng_gangs.length > 0) {
                    // 有杠, 下一家坐庄
                    has_gang = true;
                    break;
                }
            }

            if (has_gang) {
                room.next_button = (room.button + 1) % room.player_count;
            } else {
                room.next_button = room.button;
            }
        }
    } else {
        // 抢杠胡, 第一个胡牌玩家
        for (i = 1; i <= room.player_count; i++) {
            var index = (room.loser_index + i) % room.player_count;
            player = room.players[index];

            if (player.is_hued) {
                winner_index = player.index;
                break;
            }
        }

        if (winner_index >= 0) {
            room.next_button = winner_index;
        } else {
            // 不可能
            console.log('做庄不可能');
        }
    }
};

module.exports = new YunchengGameModule();