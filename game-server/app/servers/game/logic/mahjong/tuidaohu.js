/**
 * Created by leo on 3/16/2018.
 */

var mj_util = require('./mj_util');
var MahjongGameModule = require('./mahjong');

function TuidaohuGameModule() {
    MahjongGameModule.call(this);

    // -- 推倒胡常量 --
    // 点杠/炮
    this.CONSTANT.GANG_PAO = {
        YI_JIA: 'yijia',                                                                                                //  点杠/炮一家付
        SAN_JIA: 'sanjia'                                                                                               //  点杠/炮三家付
    };
    // 胡牌类型
    this.CONSTANT.HU_TYPE = {
        DAHU: 'dahu',                                                                                                   //  大胡
        PINGHU: 'pinghu'                                                                                                //  平胡
    };
}

TuidaohuGameModule.prototype = new MahjongGameModule();
TuidaohuGameModule.prototype.constructor = TuidaohuGameModule;

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
 *      settings    创建选项
 *          gang_pao:  点杠/炮一家付/三家付
 *          hu_type   胡牌类型
 *
 *          has_baoting 报听(可选)
 *          has_daifeng 带风(可选)
 *          has_zimo 只可自摸胡(可选)
 *          has_tingkou 改变听口不能杠(可选)
 *          has_huanggang 荒庄不荒杠(可选)
 *          has_yipaoduoxiang 一炮多响(可选)
 * @param callback
 * @returns {*}
 */
TuidaohuGameModule.prototype.canCreateRoom = function(user, conf, callback) {
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
            var gang_pao = settings.gang_pao;                   //  点杠/炮一家付/三家付
            var hu_type = settings.hu_type;                     //  金数

            // 1. 点杠/炮一家付/三家付
            if (gang_pao !== self.CONSTANT.GANG_PAO.YI_JIA && gang_pao !== self.CONSTANT.GANG_PAO.SAN_JIA) {
                return callback(ERROR.INVALID_CREATE_ROOM_SETTINGS);
            }

            // 2. 胡牌类型
            if (hu_type !== self.CONSTANT.HU_TYPE.PINGHU &&
                hu_type !== self.CONSTANT.HU_TYPE.DAHU) {
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
//  resetPlayer:          初始化玩家信息（每局开始前的初始化）
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 初始化玩家信息（每局开始前的初始化）
 *
 * @param room
 * @param player
 */
TuidaohuGameModule.prototype.resetPlayer = function(room, player) {
    MahjongGameModule.prototype.resetPlayer.call(this, room, player);

    // 过胡标记
    player.guo_hu = false;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏相关
//
//  doRoundStart:               开始新的一局
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 开始新的一局
 *
 * @param room: 游戏房间
 */
TuidaohuGameModule.prototype.doRoundStart = function(room) {
    if (room.settings.has_daifeng) {
        this.used_pai_count = 34;
    } else {
        this.used_pai_count = 30;
    }
    MahjongGameModule.prototype.doRoundStart.call(this, room);

    // 开始抓牌
    this.startZhuapai(room);
};

TuidaohuGameModule.prototype.testDeal = function(room) {
    MahjongGameModule.prototype.testDeal.call(this, room);

    var player0 = room.players[0];
    var player1 = room.players[1];
    var player2 = room.players[2];
    var player3 = room.players[3];

    // 十三幺
    // player1.holds = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

    // 清一色
    // player1.holds = [0, 1, 2, 4, 4, 4, 6, 6, 6, 7, 7, 7, 3];

    // 改变听口不能杠
    // player1.holds = [0, 1, 2, 4, 4, 4, 6, 6, 6, 7, 7, 7, 3];

    // 一炮多响
    player0.holds = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 8];
    player1.holds = [11, 12, 13, 14, 15, 16, 21, 22, 23, 27, 27, 27, 8];

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
    for (i = 0; i < room.player_count; i++) {
        mj_util.sort(room.players[i].holds, room.jin_pais);
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  手牌判断相关
//
//  filterGangs:                    过滤不可以杠的牌(改变听口不能杠)
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
 * 过滤不可以杠的牌(改变听口不能杠)
 *
 * @param room: 房间信息
 * @param player: 要杠牌的玩家
 */
TuidaohuGameModule.prototype.filterGangPais = function(room, player) {
    if (! room.settings.has_tingkou || room.settings.has_baoting) {
        return;
    }

    if (! player.can_gang) {
        return;
    }

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
        mj_util.prepareTuidaohuTingPais(player, 0, this.used_pai_count - 1);

        console.log('玩家', player.index, '的old_ting_map', old_ting_map, '新的ting_map', player.ting_map);
        if (! player.is_ting && UTIL.hasSameProperties(old_ting_map, player.ting_map) ||
               player.is_ting && JSON.stringify(player.ting_map) !== '{}') {
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
TuidaohuGameModule.prototype.checkCanMingGang = function(room, player, target_pai) {
    MahjongGameModule.prototype.checkCanMingGang.call(this, room, player, target_pai);

    this.filterGangPais(room, player);
};

/**
 * 是否可以暗杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
TuidaohuGameModule.prototype.checkCanAnGang = function(room, player) {
    MahjongGameModule.prototype.checkCanAnGang.call(this, room, player);

    this.filterGangPais(room, player);
};

/**
 * 是否可以碰杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
TuidaohuGameModule.prototype.checkCanPengGang = function(room, player) {
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
TuidaohuGameModule.prototype.checkCanQiangGang = function(room, gang_player, pai) {
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

        if (room.settings.has_baoting && ! player.is_ting) {
            continue;
        }

        if (player.guo_hu) {
            continue;
        }

        this.checkCanHu(room, player, pai);

        if (player.can_hu) {
            this.sendOperations(room, player, pai);
            has_actions = true;

            if (! room.settings.has_yipaoduoxiang) {
                // 没有勾选一炮多响, 只提示给一个玩家
                break;
            }
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
TuidaohuGameModule.prototype.prepareTingPais = function(room, player) {
    player.ting_map = {};
    player.fan = 0;

    // 检查是不是平胡
    mj_util.prepareTuidaohuTingPais(player, 0, this.used_pai_count - 1);

    MahjongGameModule.prototype.prepareTingPais.call(this, room, player);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家操作相关(1)
//
//  doUserTurn:                 轮到玩家, 让他来操作
//
//  _doGang:                    玩家杠牌（实际操作）
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
TuidaohuGameModule.prototype.doUserTurn = function(room, did_mopai) {
    MahjongGameModule.prototype.doUserTurn.call(this, room, did_mopai);

    var player = room.players[room.turn];

    // 检查能不能胡
    if (did_mopai === true) {
        // 检查碰杠
        this.checkCanPengGang(room, player);

        if (! player.is_ting) {
        }

        // 检查自摸, 用最后一张来检查
        this.checkCanHu(room, player, player.holds[player.holds.length - 1]);
    }

    // 检查能不能暗杠
    this.checkCanAnGang(room, player);

    if (! player.is_ting) {
        if (room.settings.has_baoting) {
            // 检查能不能报听
            this.checkCanBaoTing(room, player);
        }

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
 * 玩家杠牌（实际操作）
 *
 * @param room
 * @param player
 * @param pai
 * @private
 */
TuidaohuGameModule.prototype._doGang = function(room, player, pai) {
    var count = player.count_map[pai];
    var gang_type;

    switch (count) {
        case 1: // 碰杠
            gang_type = mj_util.GANG_TYPE.PENG_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        case 3: // 明杠
            gang_type = mj_util.GANG_TYPE.MING_GANG;
            if (room.players[room.turn].is_ting || room.settings.gang_pao === this.CONSTANT.GANG_PAO.SAN_JIA) {
                // 如果点杠玩家听牌之后点的杠(或者点杠/炮三家付), 需要和大家一起付
                this.recordGangScore(room, player, gang_type, -1);
            } else {
                this.recordGangScore(room, player, gang_type, room.turn);
            }
            break;
        case 4: // 暗杠
            gang_type = mj_util.GANG_TYPE.AN_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        default:
            return;
    }

    // 从手牌中删除
    var i, index;
    for (i = 0; i < count; i++) {
        index = player.holds.indexOf(pai);
        player.holds.splice(index, 1);
        player.count_map[pai] --;
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
    }

    // 准备听牌列表
    this.prepareTingPais(room, player);

    // 撤销轮子出的牌
    this.undoTurnFolds(room);

    // 做记录
    this.recordGameAction(room, player.index, this.ACTION.GANG, pai);

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.GANG,
        data: {
            type: gang_type,
            pai: pai
        }
    });

    // 轮到杠牌玩家
    this.moveToNextUser(room, player.index);

    // 让他摸牌
    this.doMoPai(room);
};


/**
 * 玩家听牌
 *
 * @param room
 * @param player
 * @param pai
 */
TuidaohuGameModule.prototype.doTing = function(room, player, pai) {
    MahjongGameModule.prototype.doTing.call(this, room, player, pai);
};

/**
 * 玩家胡牌
 *
 * @param room
 * @param player
 */
TuidaohuGameModule.prototype.doHu = function(room, player) {
    MahjongGameModule.prototype.doHu.call(this, room, player);

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
        // 自摸, 点炮胡
        pai = room.chu_pai;
    }

    // 标记为胡
    player.is_hued = true;

    // 做记录
    this.recordGameAction(room, player.index, this.ACTION.HU, pai);

    // 清理所有等待记录
    this.clearAllOptions(room, player);

    // 不能再出牌
    player.can_chu_pai = false;

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.HU,
        pai: pai
    });

    if (room.settings.has_yipaoduoxiang) {
        // 其他可以胡牌的玩家也要通知大家
        for (var i = 0; i < room.player_count; i++) {
            var other_player = room.players[i];

            // 不能再出牌(抢杠胡, 杠的玩家也不能出牌)
            other_player.can_chu_pai = false;

            // 其他玩家不能胡牌，或者已经胡牌，直接过
            if (! other_player.can_hu || other_player.is_hued) {
                continue;
            }

            // 剩下的就是可以胡牌，但是还没胡的玩家
            // 标记为胡
            other_player.is_hued = true;
            // 做记录
            this.recordGameAction(room, other_player.index, this.ACTION.HU, pai);
            // 清理所有等待记录
            this.clearAllOptions(room, other_player);
            // 广播给大家
            room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
                player_index: other_player.index,
                type: this.ACTION.HU,
                pai: pai
            });
        }
    }

    this.delayRoundOver(room);
};

/**
 * 玩家过牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
TuidaohuGameModule.prototype.doGuo = function(room, player) {
    MahjongGameModule.prototype.doGuo.call(this, room, player);

    if (this.hasOperations(player) === false) {
        return;
    }

    if (player.is_ting && player.can_hu) {
        // 【听牌】, 遇到胡必须胡
        return;
    }

    if (player.can_hu) {
        // 过胡标记
        player.guo_hu = true;
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

    var i;
    if (room.chu_pai >= 0) {
        if (! room.settings.has_yipaoduoxiang) {
            // 没有勾选一炮多响, 需要依次提示胡牌
            for (i = 1; i < room.player_count; i++) {
                var other_player = room.players[(i + player.index) % room.player_count];
                if (other_player.index === room.turn) {
                    // 扫描完了
                    break;
                }

                this.checkCanHu(room, other_player, room.chu_pai);

                if (other_player.can_hu) {
                    // 有人可以接着胡牌了
                    this.sendOperations(room, other_player, room.chu_pai);
                    return;
                }
            }
        }
    } else {
        if (! room.settings.has_yipaoduoxiang && room.qianggang_context) {
            // 抢杠胡玩家【过】, 需要接着扫描
            var has_qianggang = this.checkCanQiangGang(room, room.qianggang_context.player, room.qianggang_context.pai);
            if (has_qianggang) {
                // 有人可以接着胡牌了
                return;
            }
        }
    }

    // 如果其他人还可以操作
    for (i = 0; i < room.player_count; i++) {
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
TuidaohuGameModule.prototype.doChuPai = function(room, player, pai) {
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

    // 解除过胡
    player.guo_hu = false;

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

    // 玩家出了其他牌
    player.folds.push(room.chu_pai);

    // 广播给大家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        player_index: player.index,
        type: this.ACTION.CHU_PAI,
        pai: pai
    });

    // 检查是否有人要碰, 杠, 胡
    var has_actions = false;
    var need_check_hu = true;

    if (room.settings.has_zimo) {
        // 只可自摸胡, 不要检查点炮胡
        need_check_hu = false;
    }

    for (var i = 0; i < room.player_count; i++) {
        // 从轮子下一家开始扫描
        var other_player = room.players[(i + room.turn) % room.player_count];
        // 玩家自己不检查
        if (room.turn === other_player.index) {
            continue;
        }

        if (! other_player.is_ting) {
            // 听牌玩家不检查碰
            this.checkCanPeng(room, other_player, pai);
        }
        // 听牌之后也可以杠, 只要保持听状态(改变听口无所谓)
        this.checkCanMingGang(room, other_player, pai);

        if (other_player.guo_hu) {
            continue;
        }

        if (need_check_hu) {
            this.checkCanHu(room, other_player, pai);

            if (! room.settings.has_yipaoduoxiang && other_player.can_hu) {
                // 如果没有勾选一炮多响, 只提示给一个玩家
                need_check_hu = false;
            }
        }

        if (this.hasOperations(other_player)) {
            this.sendOperations(room, other_player, room.chu_pai);
            has_actions = true;
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
//  calculateRoundResult:           计算回合结果
//  prepareRoundResultData:         准备通知给客户端的回合信息
//  decideNextRoundButton:          决定下一局庄家
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 计算回合结果
 *
 * @param room: 房间信息
 */
TuidaohuGameModule.prototype.calculateRoundResult = function(room) {
    var self = this;
    // 本回合分数都保存到这儿
    var results = [];

    // 计算翻番
    var calculateFanFan = function(winner_player) {
        // 翻番
        if (room.settings.hu_type === self.CONSTANT.HU_TYPE.DAHU) {
            if (mj_util.isQiDui(winner_player.count_map, [], 0)) {
                if (mj_util.isHaohuaQiDui(winner_player.count_map, 0)) {
                    // 豪华七小对
                    winner_player.patterns.push(self.PATTERN.HAOHUA_QIXIAODUI);
                    winner_player.fan = 6;
                } else {
                    // 七小对
                    winner_player.patterns.push(self.PATTERN.QIXIAODUI);
                    winner_player.fan = 3;
                }
            }
            if (mj_util.isQingYiSe(winner_player, [])) {
                // 清一色
                winner_player.patterns.push(self.PATTERN.QINGYISE);
                winner_player.fan = 3;
            }
            if (mj_util.isYiTiaoLong(winner_player, [], 0)) {
                // 一条龙
                winner_player.patterns.push(self.PATTERN.YITIAOLONG);
                winner_player.fan = 3;
            }
            if (mj_util.isShiSanYao(winner_player.count_map, [], 0)) {
                // 十三幺
                winner_player.patterns.push(self.PATTERN.SHISANYAO);
                winner_player.fan = 9;
            }
        }

        if (winner_player.fan > 1) {
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

            // 自摸, 要扣取所有玩家
            results[player.index].score -= winner_player.fan;
            results[winner_index].score += winner_player.fan;
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

            if (room.settings.gang_pao === self.CONSTANT.GANG_PAO.SAN_JIA || loser_player.is_ting) {
                // 点炮三家付
                for (var j = 0; j < room.player_count; j++) {
                    var player = room.players[j];
                    if (player.index === winner_index) {
                        continue;
                    }

                    results[player.index].score -= winner_player.fan;
                }
            } else {
                results[loser_player.index].score -= 3 * winner_player.fan;
            }
            results[winner_index].score += 3 * winner_player.fan;
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

    // 找到所有赢家位置
    var winner_indices = [];
    for (i = 0; i < room.player_count; i++) {
        player = room.players[i];

        if (player.is_hued) {
            winner_indices.push(i);
        }
    }

    if (! room.settings.has_huanggang && winner_indices.length === 0) {
        // 没有勾选【荒庄不荒杠】, 而且荒庄, 不算杠分
    } else {
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
            room.players[winner_index].patterns.push(this.PATTERN.DIANPAO_HU);
            room.players[loser_index].patterns.push(this.PATTERN.DIANPAO);

            // 计算翻番
            // 点炮牌要算进去
            appendCountMap(room.players[winner_index], room.chu_pai);
            calculateFanFan(room.players[winner_index]);
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
                room.players[winner_index].patterns.push(this.PATTERN.QIANGGANG_HU);
                room.players[room.loser_index].patterns.push(this.PATTERN.BEI_QIANGGANG);

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

            if (room.players[winner_index].fan > 1) {
                // 大胡 + 自摸要另算6分
                room.players[winner_index].fan += 6;
            } else {
                // 平胡 + 自摸总算6分
                room.players[winner_index].fan = 2;
            }

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
TuidaohuGameModule.prototype.prepareRoundResultData = function(room, round_results) {
    return MahjongGameModule.prototype.prepareRoundResultData.call(this, room, round_results);
};

/**
 * 决定下一局庄家
 *
 * @param room: 房间信息
 */
TuidaohuGameModule.prototype.decideNextRoundButton = function(room) {
    // 【推倒胡】谁胡谁做庄)
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
            // 黄庄, 摸到最后一张牌的人坐庄
            room.next_button = room.turn;
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


module.exports = new TuidaohuGameModule();