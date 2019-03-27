/**
 * Created by leo on 3/23/2018.
 */

var GameModule = require('../game_module');
var Event = module_manager.getModule(CONST.MODULE.EVENT);

var mj_util = require('./mj_util');

function MahjongGameModule() {
    GameModule.call(this);

    // 等待时间(ms)
    this.SPAN = {
        READY_TO_START: 600,
        JIAO_JIN: 2000,
        JIAO_BAO: 2000,
        OPERATION_LIMIT: 15000,
        AUTO_CHU_PAI: 500,
        HU_PAI: 2000
    };

    // 麻将操作类型
    this.ACTION.MOPAI = 'mopai';                                                                                        // 摸牌
    this.ACTION.CHI = 'chi';                                                                                            // 吃
    this.ACTION.PENG = 'peng';                                                                                          // 碰
    this.ACTION.QIANGPENG = 'qiangpeng';

    this.ACTION.GANG = 'gang';                                                                                          // 杠(操作)
    this.ACTION.XUANFENG_GANG = 'xuanfeng_gang';
    this.ACTION.XI_GANG = 'xi_gang';
    this.ACTION.YAO_GANG = 'yao_gang';
    this.ACTION.JIU_GANG = 'jiu_gang';
    this.ACTION.BU_GANG = 'bu_gang';

    this.ACTION.HANGANG = 'hangang';                                                                                    // 杠(动画 + 音效)
    this.ACTION.TING = 'ting';                                                                                          // 听
    this.ACTION.HU = 'hu';                                                                                              // 胡
    this.ACTION.SHI = 'shi';                                                                                            // 拾牌(沁水麻将)
    this.ACTION.QIANG = 'qiang';                                                                                        // 抢牌(沁水麻将)
    this.ACTION.SET_SHIQIANG = 'set_shiqiang';                                                                          // 十三幺可拾抢(开启)
    this.ACTION.UNSET_SHIQIANG = 'unset_shiqiang';                                                                      // 十三幺可拾抢(关闭)
    this.ACTION.SHUAI_JIN = 'shuai_jin';                                                                                // 甩金(沁水麻将)
    this.ACTION.VIEW_PAI = 'view_pai';

    // 回合结束时玩家的Pattern情况
    this.PATTERN = {
        ZIMO: 'zimo',                               // 自摸
        DIANPAO_HU: 'dianpaohu',                    // 点炮胡
        DIANPAO: 'dianpao',                         // 点炮
        SHANGJIAJIECHU: 'shangjiajiechu',           // 上架皆出
        QIANGGANG_HU: 'qiangganghu',                // 抢杠胡
        BEI_QIANGGANG: 'bei_qianggang',             // 被抢杠
        DIAN_GANG: 'dian_gang',                     // 点杠
        MING_GANG: 'ming_gang',                     // 明杠
        AN_GANG: 'an_gang',                         // 暗杠
        PENG_GANG: 'peng_gang',                     // 碰杠
        XUANFENG_GANG: 'xuanfeng_gang',
        XI_GANG: 'xi_gang',
        YAO_GANG: 'yao_gang',
        JIU_GANG: 'jiu_gang',
        BU_GANG: 'bu_gang',
        DADAN_GANG: 'dadan_gang',

        DIAN_CHI: 'dian_chi',                       // 点吃(吃牌扣分)
        BONUS_CHI: 'chi_bonus',                     // 吃牌加分
        PEIJIN: 'peijin',                           // 陪金

        QIXIAODUI: 'qixiaodui',                     // 七小对
        HAOHUA_QIXIAODUI: 'haohua_qixiaodui',       // 豪华七小对
        SHISANYAO: 'shisanyao',                     // 十三幺
        QINGYISE: 'qingyise',                       // 清一色
        YITIAOLONG: 'yitiaolong',                   // 一条龙

        PINGHU: 'pinghu',                           // 平胡
        DAHU: 'dahu',                                // 大胡
        JIAHU: 'jiahu',
        PIAOHU: 'piaohu',
        ZHANLI: 'zhanli'
    };

    // 麻将数量
    this.used_pai_count = 34;

    // 是否有吃牌
    this.has_chi = false;
}
MahjongGameModule.prototype = new GameModule();
MahjongGameModule.prototype.constructor = MahjongGameModule;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  房间相关
//
//  initRoom:               初始化房间
//
//  getRoomData:            获取游戏房间信息
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 初始化房间
 *
 * @param room
 */
MahjongGameModule.prototype.initRoom = function(room) {
    GameModule.prototype.initRoom.call(this, room);

    // 麻将共同房间属性
    room.mahjongs = [];
    room.current_index = 0;
    room.chu_pai = -1;
    // 带【金】的麻将
    room.jin_pais = [];
    room.baipai = -1;
};

/**
 * 获取游戏房间信息
 *
 * @param room 房间信息
 */
MahjongGameModule.prototype.getRoomData = function(room) {
    var data = GameModule.prototype.getRoomData.call(this, room);

    // 麻将共同属性
    data.current_index = room.current_index;
    data.mahjong_count = room.mahjongs.length - room.current_index;
    data.chu_pai = room.chu_pai;
    // 带【金】的麻将
    data.jin_pais = room.jin_pais;
    data.bao_pai = room.bao_pai;

    // 回合结算信息
    data.round_result = room.round_result;
    data.round_over_time = room.round_over_time;

    return data;
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
MahjongGameModule.prototype.initPlayer = function(room, player) {
    GameModule.prototype.initPlayer.call(this, room, player);

    // 统计信息
    player.score = 0;                   //  总分数
    player.num_zimo = 0;                //  自摸次数
    player.num_dianpaohu = 0;           //  点炮胡次数
    player.num_dianpao = 0;             //  点炮次数
    player.num_shangjiajiechu = 0;      //  上架皆出(听牌之后自动打出的牌点炮)
    player.num_peijin = 0;              //  陪金次数(沁水麻将)
    player.num_qianggang = 0;           //  抢杠胡次数
    player.num_beiqianggang = 0;        //  被抢杠次数
    player.num_minggang = 0;            //  明杠次数
    player.num_angang = 0;              //  暗杠次数
    player.num_penggang = 0;            //  碰杠次数

    this.resetPlayer(room, player);
};

/**
 * 初始化玩家信息（每局开始前的初始化）
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.resetPlayer = function(room, player) {
    GameModule.prototype.resetPlayer.call(this, room, player);

    player.count_map = {};                                                                                              //  玩家手上的牌的数目, 用于快速判定碰杠
    for (var i = 0; i < this.used_pai_count; i++) {
        player.count_map[i] = 0;
    }
    player.ting_map = {};                                                                                               //  玩家听牌, 用于快速判定胡牌
    player.holds = [];                                                                                                  //  持有的牌
    player.folds = [];                                                                                                  //  打出的牌
    player.jin_folds = [];                                                                                              //  打出的金牌
    player.pengs = [];                                                                                                  //  碰了的牌
    player.an_gangs = [];                                                                                               //  暗杠的牌
    player.ming_gangs = [];                                                                                             //  明杠的牌
    player.peng_gangs = [];                                                                                             //  碰杠的牌

    //by bee for changchun 2019.03.08
    player.xuanfeng_gangs = [];                                                                                         //长春麻将特色 - 旋风杠
    player.xi_gangs = [];                                                                                               //长春麻将特色 - 喜杠
    player.yao_gangs = [];
    player.jiu_gangs = [];
    player.bu_gangs = [];                                                                                               //补扛，临时保存在这儿，确定补杠了之后再放在具体位置，补杠了之后要检查是否可以碰，胡

    player.first_time = true;

    if (this.has_chi) {
        player.chis = [];                                                                                               //  吃了的牌组
        player.can_chi = false;                                                                                        //  是否可以吃牌
        player.chi_pais = [];                                                                                           //  可以吃的牌型
    }
    player.can_peng = false;                                                                                           //  是否可以碰牌
    player.can_gang = false;                                                                                           //  是否可以杠牌
    player.gang_pais = [];                                                                                              //  可以杠的牌
    player.gang_actions = [];                                                                                           //  杠操作记录
    player.bao_ting_pai = -1;                                                                                           //  报听的牌
    player.is_ting = false;                                                                                            //  是否在听牌
    player.can_ting = false;                                                                                           //  是否可以听牌
    player.bao_ting_maps = {};                                                                                          //  可以报听(1=>{3, 4...})
    player.patterns = [];                                                                                               //  回合结算时, 玩家的Pattern(自摸/抢杠胡/点炮胡/点炮/点杠/明杠/暗杠/碰杠/十三幺/一条龙/七小对/清一色)

    player.can_hu = false;                                                                                             //  是否可以胡牌
    player.is_hued = false;                                                                                            //  是否胡了牌
    player.can_chu_pai = false;                                                                                        //  是否可以出牌(防止同时出多张)
    player.fan = 0;                                                                                                     //  胡牌的番数
};

/**
 * 获取玩家的公共信息（供给前端用）
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param is_me: 是否我的信息
 */
MahjongGameModule.prototype.getPlayerData = function(room, player, is_me) {
    var player_data = GameModule.prototype.getPlayerData.call(this, room, player);

    // 麻将共同的玩家信息
    player_data.folds = player.folds;
    player_data.jin_folds = player.jin_folds;
    player_data.pengs = player.pengs;
    player_data.ming_gangs = player.ming_gangs;
    player_data.an_gangs = player.an_gangs;
    player_data.peng_gangs = player.peng_gangs;

    //by bee
    player_data.xuanfeng_gangs = player.xuanfeng_gangs;
    player_data.xi_gangs = player.xi_gangs;
    player_data.yao_gangs = player.yao_gangs;
    player_data.jiu_gangs = player.jiu_gangs;
    player_data.bu_gangs = player.bu_gangs;


    if (this.has_chi) {
        // 有吃的麻将, 也要带吃
        player_data.chis = player.chis;
    }

    if (room.status === CONST.ROOM_STATUS.PLAYING && room.game_status === CONST.GAME_STATUS.PLAYING) {
        // 正在玩才同步以下信息
        player_data.ting_map = player.ting_map;
        player_data.is_ting = player.is_ting;
        player_data.bao_ting_maps = player.bao_ting_maps;
    }

    if (is_me || (room.status === CONST.ROOM_STATUS.PLAYING && room.game_status !== CONST.GAME_STATUS.PLAYING)) {
        // 我的手牌, 或者回合结束, 显示手牌
        player_data.holds = player.holds;
    } else {
        // 不能显示手牌
        player_data.holds = [];
        for (var i = 0; i < player.holds.length; i++) {
            player_data.holds[i] = -1;
        }
    }

    return player_data;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏相关
//
//  syncGameData:               同步游戏
//  getPlayerChoices:           准备玩家的可用操作
//
//  doRoundStart:               开始新的一局
//
//  startZhuapai:               开始抓牌
//
//  shuffle:                    洗牌
//  deal:                       发牌
//  mopai:                      摸牌
//
//  startPlay:                  正式开始游戏牌局
//  backupRoundInfo:            保存这一局的基本信息，以便这一局结束后保存到数据库
//  recordGameAction:           记录游戏操作
//  recordGangScore:            记录杠牌的情况(谁给谁的杠牌, 哪一种杠)
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 同步游戏
 *
 * @param room: 房间信息
 * @param user_id: 用户ID。玩家，旁观者均可。
 */
MahjongGameModule.prototype.syncGameData = function(room, user_id) {
    var data = this.getRoomData(room);
    var player;

    data.players = [];
    for (var i = 0; i < room.players.length; i++) {
        player = room.players[i];

        if (! player) {
            data.players.push(null);
        } else {
            var player_data = this.getPlayerData(room, player, player.id === user_id);

            data.players.push(player_data);
        }
    }

    // 如果是玩家, 需要插入可用的操作
    player = room.getPlayer(user_id);
    if (player && this.hasOperations(player)) {
        data.choices = this.getPlayerChoices(room, player);
    }

    // 推送
    room.sendMsg(user_id, CONST.PUSH.GAME_SYNC_PUSH, data);
};

/**
 * 准备玩家的可用操作
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.getPlayerChoices = function(room, player) {
    var choices = {};
    choices.can_peng = player.can_peng;
    choices.can_gang = player.can_gang;
    choices.can_ting = player.can_ting;
    choices.can_hu = player.can_hu;
    choices.gang_pais = player.gang_pais;
    choices.target_pai = room.chu_pai;

    if (this.has_chi) {
        choices.can_chi = player.can_chi;
        choices.chi_pais = player.chi_pais;
    }

    return choices;
};

/**
 * 开始新的一局
 *
 * @param room: 游戏房间
 */
MahjongGameModule.prototype.doRoundStart = function(room) {
    GameModule.prototype.doRoundStart.call(this, room);
};

/**
 * 回合开始初始化
 *
 * @param room: 游戏房间
 */
MahjongGameModule.prototype.prepareRoundStart = function(room) {
    GameModule.prototype.prepareRoundStart.call(this, room);

    room.mahjongs = new Array(4 * this.used_pai_count);        //  麻将牌
    room.current_index = 0;                                     //  正在发牌的麻将
    room.chu_pai = -1;                                          //  当前出的牌, 用来判断自摸
    room.qianggang_context = null;                             //  抢杠信息
    room.qiangpeng_context = null;
    room.loser_index = -1;                                      //  被抢杠的玩家位置

    room.jin_pais = [];                                         //  金牌
    room.bao_pai = -1;
};

/**
 * 开始抓牌
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.startZhuapai = function(room) {
    room.game_status = CONST.GAME_STATUS.ZHUAPAI;

    // 洗牌
    this.shuffle(room);

    // 发牌
    this.deal(room);

    // by bee
    //this.testDeal(room);

    // 开局时，给每位玩家分别通知手牌
    var players = room.players;
    for (var i = 0; i < room.player_count; i++) {
        var player = players[i];

        // 给当前玩家通知手牌
        room.sendMsg(player.id, CONST.PUSH.PLAYER_HOLDS_PUSH, player.holds);

        // 给其他玩家通知手牌(-1)
        var holds = [];
        for (var j = 0; j < player.holds.length; j++) {
            holds.push(-1);
        }
        room.pushMessage(CONST.PUSH.SPECTATOR_HOLDS_PUSH, {
            holds: holds,
            player_index: player.index
        }, player.id);

        // 检查可以听的牌
        this.prepareTingPais(room, player);
    }

    // 可以开始玩了
    this.startPlay(room);
};

/**
 * 洗牌
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.shuffle = function(room) {
    // 【万】：0 - 8
    // 【条】：9 - 17
    // 【筒】：18 - 26
    // 【中，发，白】：27 - 29
    // 【东，南，西，北】：30 - 33
    var index = 0;
    var i, j;

    // 添加【万】
    for (i = 0; i < 9; i++) {
        for (j = 0; j < 4; j++) {
            room.mahjongs[index] = i;
            index++;
        }
    }

    // 添加【条】
    for (i = 9; i < 18; i++) {
        for (j = 0; j < 4; j++) {
            room.mahjongs[index] = i;
            index++;
        }
    }

    // 添加【筒】
    for (i = 18; i < 27; i++) {
        for (j = 0; j < 4; j++) {
            room.mahjongs[index] = i;
            index++;
        }
    }

    if (this.used_pai_count >= 30) {
        // 添加【中，发，白】
        for (i = 27; i < 30; i++) {
            for (j = 0; j < 4; j++) {
                room.mahjongs[index] = i;
                index++;
            }
        }
    }

    if (this.used_pai_count >= 34) {
        // 添加【东，南，西，北】
        for (i = 30; i < 34; i++) {
            for (j = 0; j < 4; j++) {
                room.mahjongs[index] = i;
                index++;
            }
        }
    }

    // 洗牌
    for (i = 0; i < room.mahjongs.length; i++) {
        var last_index = room.mahjongs.length - 1 - i;
        index = Math.floor(Math.random() * last_index);

        var temp = room.mahjongs[index];
        room.mahjongs[index] = room.mahjongs[last_index];
        room.mahjongs[last_index] = temp;
    }
};

/**
 * 发牌
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.deal = function(room) {
    // 每人13张 一共13 * 4 = 52张
    var player_index = room.button;

    for (var i = 0; i < 13 * room.player_count; i++) {
        this.mopai(room, player_index);

        player_index ++;
        player_index %= room.player_count;
    }

    // 排序
    for (i = 0; i < room.player_count; i++) {
        mj_util.sort(room.players[i].holds, room.jin_pais);
    }
};

MahjongGameModule.prototype.testDeal = function(room) {
};

/**
 * 摸牌
 *
 * @param room: 房间信息
 * @param player_index: 玩家座位
 */
MahjongGameModule.prototype.mopai = function(room, player_index) {
    // 牌摸完了
    if (room.current_index === room.mahjongs.length) {
        return -1;
    }

    var player = room.players[player_index];

    var pai = room.mahjongs[room.current_index];
    room.current_index ++;

    player.holds.push(pai);

    // 统计牌的数目, 用于快速判定（空间换时间）
    if (! player.count_map[pai]) {
        player.count_map[pai] = 0;
    }
    player.count_map[pai] ++;

    return pai;
};

/**
 * 牌局正式开始
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.startPlay = function(room) {
    room.game_status = CONST.GAME_STATUS.PLAYING;

    // 保存这一局的基本信息，一边这一局结束后保存到数据库
    this.backupRoundInfo(room);

    // 通知游戏开始
    room.pushMessage(CONST.PUSH.GAME_PLAY_PUSH);

    // 从庄家开始摸牌
    this.moveToNextUser(room);
    this.doMoPai(room);
};

/**
 * 保存这一局的基本信息，一边这一局结束后保存到数据库
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.backupRoundInfo = function(room) {
    var round_info = {
        button: room.button,
        mahjongs: [].concat(room.mahjongs),
        jin_pais: room.jin_pais,                // 追加金牌
        holds: new Array(room.player_count)
    };

    for (var i = 0; i < room.player_count; i++) {
        round_info.holds[i] = [].concat(room.players[i].holds);
    }

    room.round_info = round_info;
};

/**
 * 记录游戏操作
 *
 * @param room: 房间信息
 * @param player_index: 玩家位置
 * @param action: 操作类型
 * @param pai: 相关牌
 */
MahjongGameModule.prototype.recordGameAction = function(room, player_index, action, pai) {
    room.action_list.push(parseInt(player_index));
    room.action_list.push(action);
    if (pai != null) {
        if (UTIL.isArray(pai)) {
            room.action_list.push(JSON.stringify(pai));
        } else {
            room.action_list.push(parseInt(pai));
        }
    }
};

/**
 * 记录杠牌的情况(谁给谁的杠牌, 哪一种杠)
 *
 * @param room: 房间信息
 * @param gang_player: 杠的玩家
 * @param type: 杠牌类型
 * @param target_index: 点杠的玩家位置
 */
MahjongGameModule.prototype.recordGangScore = function(room, gang_player, type, target_index) {
    var record = {};
    var i;
    record.score = 0;
    record.type = type;
    record.targets = [];

    switch (type) {
        case mj_util.GANG_TYPE.AN_GANG:
            gang_player.patterns.push(this.PATTERN.AN_GANG);
            record.score = 2;
            break;

        case mj_util.GANG_TYPE.MING_GANG:
            gang_player.patterns.push(this.PATTERN.MING_GANG);
            record.score = 1;
            break;

        case mj_util.GANG_TYPE.PENG_GANG:
            // 碰杠也算作明杠
            gang_player.patterns.push(this.PATTERN.PENG_GANG);
            record.score = 1;
            break;
        case mj_util.GANG_TYPE.XUANFENG_GANG:
            gang_player.patterns.push(this.PATTERN.XUANFENG_GANG);
            record.score = 1;
            break;
        case mj_util.GANG_TYPE.XI_GANG:
            gang_player.patterns.push(this.PATTERN.XI_GANG);
            record.score = 1;
            break;
        case mj_util.GANG_TYPE.YAO_GANG:
            gang_player.patterns.push(this.PATTERN.YAO_GANG);
            record.score = 1;
            break;
        case mj_util.GANG_TYPE.JIU_GANG:
            gang_player.patterns.push(this.PATTERN.JIU_GANG);
            record.score = 1;
            break;
        case mj_util.GANG_TYPE.BU_GANG:
            gang_player.patterns.push(this.PATTERN.BU_GANG);
            record.score = 1;
            break;
    }

    // 所有人
    for (i = 0; i < room.player_count; i++) {
        if (room.players[i].index !== gang_player.index) {
            record.targets.push(room.players[i].index);
        }
    }

    gang_player.gang_actions.push(record);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  手牌判断相关
//
//  checkCanChi:                    是否可以吃牌
//  checkCanPeng:                   是否可以碰牌
//
//  checkCanMingGang:               是否可以明杠
//  checkCanAnGang:                 是否可以暗杠
//  checkCanPengGang:               是否可以碰杠
//  checkCanQiangGang:              是否可以被抢杠
//
//  checkCanBaoTing:                检查是否可以报听(手牌已经齐了, 用来判断, 如果去掉一张, 可以等哪一张就可以胡)
//
//  checkCanHu:                     是否可以胡牌
//
//  prepareTingPais:                准备可以胡的牌型
//  filterTingPais:                 过滤不可能的听牌(i.e. 已打出的牌, 明杠，碰杠的牌，碰了的牌 + 自己手牌, 暗杠牌)
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 是否可以吃牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param target_pai: 目标牌
 */
MahjongGameModule.prototype.checkCanChi = function(room, player, target_pai) {
    // 吃牌只能吃上一家的牌
    if (player.index !== ((room.turn + 1) % room.player_count)) {
        return;
    }

    target_pai = parseInt(target_pai);
    if (target_pai >= 27) {
        return;
    }

    //长春麻将特色，除了飘胡，其他不能手把一
    if(player.holds.length === 4) {
        return;
    }

    // 检查n, n+1, n+2
    if (target_pai % 9 < 7) {
        if (player.count_map[target_pai + 1] > 0 && player.count_map[target_pai + 2] > 0) {
            player.can_chi = true;
            player.chi_pais.push([target_pai, target_pai + 1, target_pai + 2]);
        }
    }

    // 检查n-1, n, n+1
    if (target_pai % 9 > 0 && target_pai % 9 < 8) {
        if (player.count_map[target_pai - 1] > 0 && player.count_map[target_pai + 1] > 0) {
            player.can_chi = true;
            player.chi_pais.push([target_pai - 1, target_pai, target_pai + 1]);
        }
    }

    // 检查n-2, n-1, n
    if (target_pai % 9 > 1) {
        if (player.count_map[target_pai - 2] > 0 && player.count_map[target_pai - 1] > 0) {
            player.can_chi = true;
            player.chi_pais.push([target_pai - 2, target_pai - 1, target_pai]);
        }
    }
};

/**
 * 是否可以碰牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param target_pai: 目标牌
 */
MahjongGameModule.prototype.checkCanPeng = function(room, player, target_pai) {
    target_pai = parseInt(target_pai);

    //长春麻将特色，除了飘胡，其他不能手把一
    if(player.holds.length === 4 && mj_util.checkPiao(player) === false) {
        return;
    }

    if (player.count_map[target_pai] >= 2) {
        player.can_peng = true;
    }
};

/**
 * 是否可以明杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param target_pai: 目标牌
 */
MahjongGameModule.prototype.checkCanMingGang = function(room, player, target_pai) {
    target_pai = parseInt(target_pai);
    if (player.count_map[target_pai] >= 3) {
        player.can_gang = true;
        player.gang_pais.push([target_pai]);
        player.gang_pais.push(mj_util.GANG_TYPE.MING_GANG);
    }
};

/**
 * 是否可以暗杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.checkCanAnGang = function(room, player) {
    for (var pai in player.count_map) {
        pai = parseInt(pai);
        if (player.count_map[pai] === 4) {
            player.can_gang = true;
            player.gang_pais.push([pai]);
            player.gang_pais.push(mj_util.GANG_TYPE.AN_GANG);
        }
    }
};

/**
 * 是否可以碰杠
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.checkCanPengGang = function(room, player) {
    // 从碰了的牌中查找
    for (var i = 0; i < player.pengs.length; i++) {
        var pai = player.pengs[i];
        pai = parseInt(pai);

        if (player.count_map[pai] > 0) {
            player.can_gang = true;
            player.gang_pais.push([pai]);
            player.gang_pais.push(mj_util.GANG_TYPE.PENG_GANG);
        }
    }
};

/**
 * 是否可以补杠
 */
MahjongGameModule.prototype.checkCanBuGang = function(room, player) {
    // 已经做出了旋风杠
    if(player.xuanfeng_gangs.length > 0) {
        for(var i = 30; i < 34; i++) {
            if (player.count_map[i] > 0) {
                player.can_gang = true;
                player.gang_pais.push([i]);
                player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
            }
        }
    }
    // 已经做出了喜杠，检查可以补杠的字牌
    if(player.xi_gangs.length > 0) {
        for(var i = 27; i < 30; i++) {
            if(player.count_map[i] > 0) {
                player.can_gang = true;
                player.gang_pais.push([i]);
                player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
            }
        }
    }
    // 已经做出了幺杠，检查可以补杠的幺牌
    if(player.yao_gangs.length > 0) {
        if(player.count_map[0] > 0) {
            player.can_gang = true;
            player.gang_pais.push([0]);
            player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
        }
        if(player.count_map[9] > 0) {
            player.can_gang = true;
            player.gang_pais.push([9]);
            player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
        }
        if(player.count_map[18] > 0) {
            player.can_gang = true;
            player.gang_pais.push([9]);
            player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
        }
    }
    // 已经做出了九杠，检查可以补杠的九牌
    if(player.jiu_gangs.length > 0) {
        if(player.count_map[8] > 0) {
            player.can_gang = true;
            player.gang_pais.push([8]);
            player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
        }
        if(player.count_map[17] > 0) {
            player.can_gang = true;
            player.gang_pais.push([17]);
            player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
        }
        if(player.count_map[26] > 0) {
            player.can_gang = true;
            player.gang_pais.push([26]);
            player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
        }
    }

    if(room.settings.has_xiaojifeidan === true && player.count_map[9] > 0 && player.yao_gangs.length === 0) {
        if(player.xuanfeng_gangs.length > 0 || player.xi_gangs.length > 0 || player.jiu_gangs.length > 0) {
            player.can_gang = true;
            player.gang_pais.push([9]);
            player.gang_pais.push(mj_util.GANG_TYPE.BU_GANG);
        }
    }
};

/**
 * 是否可以喜杠
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.checkCanXiGang = function(room, player) {
    var pais = [];
    for(var i = 27; i < 30; i++) {
        if(player.count_map[i] > 0) {
            pais.push(i);
        }
    }

    var yaoji_cnt = 0;
    if(room.settings.has_xiaojifeidan === true) {
        yaoji_cnt = player.count_map[9];
    }

    if(pais.length === 3) {
        player.can_gang = true;
        player.gang_pais.push(pais);
        player.gang_pais.push(mj_util.GANG_TYPE.XI_GANG);
    } else if(pais.length === 2) {
        if(yaoji_cnt >= 1) {
            player.can_gang = true;
            pais.push(9);
            player.gang_pais.push(pais);
            player.gang_pais.push(mj_util.GANG_TYPE.XI_GANG);
        }
    } else if(pais.length === 1) {
        if(yaoji_cnt >= 2) {
            player.can_gang = true;
            pais.push(9);
            pais.push(9);
            player.gang_pais.push(pais);
            player.gang_pais.push(mj_util.GANG_TYPE.XI_GANG);
        }
    }
};

/**
 * 是否可以旋风杠
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.checkCanXuanFengGang = function(room, player) {
    var pais = [];
    for(var i = 30; i < 34; i++) {
        if(player.count_map[i] > 0) {
            pais.push(i);
        }
    }
    var yaoji_cnt = 0;
    if(room.settings.has_xiaojifeidan === true) {
        yaoji_cnt = player.count_map[9];
    }
     if(room.settings.has_sanfengdan === true) {
        if(pais.length === 3) {
            player.can_gang = true;
            player.gang_pais.push(pais);
            player.gang_pais.push(mj_util.GANG_TYPE.XUANFENG_GANG);
        } else if(pais.length === 4) {
            player.can_gang = true;
            player.gang_pais.push([30, 31, 32]);
            player.gang_pais.push(mj_util.GANG_TYPE.XUANFENG_GANG);
            player.gang_pais.push([31, 32, 33]);
            player.gang_pais.push(mj_util.GANG_TYPE.XUANFENG_GANG);
        } else if(pais.length === 2) {
            if(yaoji_cnt >= 1) {
                player.can_gang = true;
                pais.push(9);
                player.gang_pais.push(pais);
                player.gang_pais.push(mj_util.GANG_TYPE.XUANFENG_GANG);
            }
        } else if(pais.length === 1) {
            if(yaoji_cnt >= 2) {
                player.can_gang = true;
                pais.push(9);
                pais.push(9);
                player.gang_pais.push(pais);
                player.gang_pais.push(mj_util.GANG_TYPE.XUANFENG_GANG);
            }
        }
    } /*else {
        if(pais.length === 4) {
            player.can_gang = true;
            player.gang_pais.push([30, 31, 32]);
            player.gang_pais.push(mj_util.GANG_TYPE.XUANFENG_GANG);
            player.gang_pais.push([31, 32, 33]);
            player.gang_pais.push(mj_util.GANG_TYPE.XUANFENG_GANG);
        } else if(pais.length === 3) {
            if(yaoji_cnt === 1) {
                player.can_gang = true;
                pais.push(9);
                player.gang_pais.push(pais);
                player.gang_pais.push(mj_util.GANG_TYPE.XUANFENG_GANG);
            }
        } else if
    }*/
};

/**
 * 是否可以幺杠
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.checkCanYaoGang = function(room, player) {
    var pais = [];

    if(player.count_map[0] > 0) {
        pais.push(0);
    }
    if(player.count_map[9] > 0) {
        pais.push(9);
    }
    if(player.count_map[18] > 0) {
        pais.push(18);
    }

    var yaoji_cnt = 0;
    if(room.settings.has_xiaojifeidan === true) {
        yaoji_cnt = player.count_map[9];
    }

    if(pais.length === 3) {
        player.can_gang = true;
        player.gang_pais.push(pais);
        player.gang_pais.push(mj_util.GANG_TYPE.YAO_GANG);
    } else if(pais.length === 2) {
        if(yaoji_cnt >= 2) {
            player.can_gang = true;
            var yaopai = [];
            yaopai.push(9);
            yaopai.push(9);
            if(player.count_map[0] > 0) {
                yaopai.push(0);
            }
            if(player.count_map[18] > 0) {
                yaopai.push(18);
            }
            player.gang_pais.push(yaopai);
            player.gang_pais.push(mj_util.GANG_TYPE.YAO_GANG);
        }
    }
};

/**
 * 是否可以九杠
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.checkCanJiuGang = function(room, player) {
    var pais = [];

    if(player.count_map[8] > 0) {
        pais.push(8);
    }
    if(player.count_map[17] > 0) {
        pais.push(17);
    }
    if(player.count_map[26] > 0) {
        pais.push(26);
    }

    var yaoji_cnt = 0;
    if(room.settings.has_xiaojifeidan === true) {
        yaoji_cnt = player.count_map[9];
    }

    if(pais.length === 3) {
        player.can_gang = true;
        player.gang_pais.push(pais);
        player.gang_pais.push(mj_util.GANG_TYPE.JIU_GANG);
    } else if(pais.length === 2) {
        if(yaoji_cnt >= 1) {
            player.can_gang = true;
            pais.push(9);
            player.gang_pais.push(pais);
            player.gang_pais.push(mj_util.GANG_TYPE.JIU_GANG);
        }
    } else if(pais.length === 1) {
        if(yaoji_cnt >= 2) {
            player.can_gang = true;
            pais.push(9);
            pais.push(9);
            player.gang_pais.push(pais);
            player.gang_pais.push(mj_util.GANG_TYPE.JIU_GANG);
        }
    }
};

/**
 * 是否可以被抢杠
 *
 * @param room: 房间信息
 * @param gang_player: 杠牌的玩家
 * @param pai: 杠的牌
 */
MahjongGameModule.prototype.checkCanQiangGang = function(room, gang_player, pai) {
    // 不同地区玩法, 不同实现
    return false;
};

MahjongGameModule.prototype.checkCanQiangPeng = function(room, gang_player, pai) {
    // 不同地区玩法, 不同实现
    return false;
};

/**
 * 检查是否可以报听(手牌已经齐了, 用来判断, 如果去掉一张, 可以等哪一张就可以胡)
 *
 * @param room
 * @param player
 */
MahjongGameModule.prototype.checkCanBaoTing = function(room, player) {
    // 清空bao_ting_pais
    player.bao_ting_maps = {};

    // 临时保存ting_map
    var ting_map = UTIL.simple_clone(player.ting_map);

            //console.log(player.base_info.name);
            //console.log(player.holds);

            for (var i = 0; i < player.holds.length; i++) {
                var pai = player.holds[i];

                // 重复的牌, 过滤
                if (player.bao_ting_maps.hasOwnProperty(pai)) {
            continue;
        }

        // 金牌不要报听
        if (room.jin_pais.indexOf(pai) !== -1) {
            continue;
        }

        // 临时减计数
        player.count_map[pai] --;

        //如果检测到手牌里有的牌在拾抢里面的话就continue
        if (player.can_shiqiang) {
            // 如果是玩13幺的玩家, 要考虑已打出的幺牌
            /*for (var j = 0; j < player.shi_qiangs.length; j++) {
                var shiqiang_pai = player.shi_qiangs[j];
                if (! player.count_map[shiqiang_pai]) {
                    player.count_map[pai]++;            //恢复计数
                    continue;
                }
            }*/
        }

        // 判断如果去掉pai, 都可以听那些牌
        this.prepareTingPais(room, player);

        // 如果可以听牌, 写入bao_ting_pais
        if (JSON.stringify(player.ting_map) !== '{}') {
            //if (player.can_shiqiang) {
                /*var flag = false;
                for (var j = 0; j < player.shi_qiangs.length; j++) {
                    var shiqiang_pai = player.shi_qiangs[j];
                    if (! player.count_map[shiqiang_pai]) {
                        flag = true;
                        break;
                    }
                }
                if(flag === false)
                    player.bao_ting_maps[pai] = player.ting_map;
                else
                    player.ting_map = {};
            } else {*/
            //}
            player.bao_ting_maps[pai] = player.ting_map;
        }

        // 恢复计数
        player.count_map[pai] ++;
    }

    // 如果可以报听, 发送消息
    if (JSON.stringify(player.bao_ting_maps) !== '{}') {
        player.can_ting = true;

        // 在sendOperation一起发送bao_ting_maps
        room.sendMsg(player.id, CONST.PUSH.PLAYER_BAO_TING_MAPS_PUSH, {
            bao_ting_maps: player.bao_ting_maps
        });

        console.log('房间【', room.id, ' 第', room.round_no ,'回合 俱乐部: ', room.club_id,'】的玩家【', player.id , ' ', player.base_info.name, '】可以报听，他的手牌是', player.holds);
    } else {
        player.can_ting = false;
    }

    // 恢复ting_map
    player.ting_map = UTIL.simple_clone(ting_map);
};

/**
 * 是否可以胡牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param target_pai: 目标牌
 */
MahjongGameModule.prototype.checkCanHu = function(room, player, target_pai) {
    target_pai = parseInt(target_pai);
    player.can_hu = false;

    for (var pai in player.ting_map) {
        if (! player.ting_map.hasOwnProperty(pai)) {
            continue;
        }

        pai = parseInt(pai);
        if (pai === target_pai) {
            player.can_hu = true;
            player.fan = player.ting_map[pai].fan;

            return;
        }
    }
};

/**
 * 准备可以胡的牌型(少一张, 用来判断, 如果要胡需要哪一张牌)
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.prepareTingPais = function(room, player) {
    // 如果已打出的牌, 就不能听咯(因为有金牌故注释掉)
    this.filterTingPais(room, player);
};

/**
 * 过滤不可能的听牌(i.e. 已打出的牌 + 已打出的金牌, 明杠, 碰杠, 暗杠的牌, 碰了的牌 + 自己手牌)
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.filterTingPais = function (room, player) {
    var i, j;
    for (var pai in player.ting_map) {
        if (! player.ting_map.hasOwnProperty(pai)) {
            continue;
        }

        pai = parseInt(pai);

        var out_count = 0;
        for (i = 0; i < room.player_count; i++) {
            var _player = room.players[i];

            // 已打出的牌
            for (j = 0; j < _player.folds.length; j++) {
                if (_player.folds[j] === pai) {
                    out_count ++;
                }
            }

            // 已打出的金牌
            for (j = 0; j < _player.jin_folds.length; j++) {
                if (_player.jin_folds[j] === pai) {
                    out_count ++;
                }
            }

            // 明杠
            for (j = 0; j < _player.ming_gangs.length; j++) {
                if (_player.ming_gangs[j] === pai) {
                    out_count += 4;
                }
            }

            // 碰杠
            for (j = 0; j < _player.peng_gangs.length; j++) {
                if (_player.peng_gangs[j] === pai) {
                    out_count += 4;
                }
            }

            // 暗杠
            for (j = 0; j < _player.an_gangs.length; j++) {
                if (_player.an_gangs[j] === pai) {
                    out_count += 4;
                }
            }

            // 碰
            for (j = 0; j < _player.pengs.length; j++) {
                if (_player.pengs[j] === pai) {
                    out_count += 3;
                }
            }

            // 吃
            if(_player.chis) {
                for (j = 0; j < _player.chis.length; j++) {
                    if (_player.chis[j].indexOf(pai) !== -1) {
                        out_count += 1;
                    }
                }
            }
        }

        /*// 再加上自己的暗杠
        for (i = 0; i < player.an_gangs.length; i++) {
            if (player.an_gangs[i] === pai) {
                out_count ++;
            }
        }*/
        // 再加上自己的手牌
        out_count += player.count_map[pai];

        if (out_count === 4) {
            // delete player.ting_map[pai];
            player.ting_map[pai].left_count = 4 - out_count;
        } else {
            // 计数剩下的数量(报听用到)
            player.ting_map[pai].left_count = 4 - out_count;
        }
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家操作相关(1)
//
//  clearAllOptions:            清理指定玩家的所有操作, 【胡】，【杠】，【碰】，【吃】，【过】之后需要调用
//  hasOperations:              检查有没有【胡】，【杠】，【碰】，【吃】操作
//  sendOperations:             通知用户的操作
//
//  moveToNextUser:             移到下一个玩家操作
//
//  doMoPai:                    玩家摸牌
//  doUserTurn:                 轮到玩家, 让他来操作
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 清理指定玩家的所有操作, 【胡】，【杠】，【碰】，【过】之后需要调用
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.clearAllOptions = function(room, player) {
    var self =  this;
    var clear = function(player) {
        player.can_peng = false;
        player.can_gang = false;
        player.gang_pais = [];
        player.can_hu = false;

        player.can_ting = false;

        if (self.has_chi) {
            player.can_chi = false;
            player.chi_pais = [];
        }
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
 * 检查有没有【胡】，【杠】，【碰】操作
 *
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.hasOperations = function(player) {
    return (player.can_peng || player.can_gang || player.can_ting || player.can_hu || this.has_chi && player.can_chi);
};

/**
 * 通知用户的操作
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param target_pai: 目标牌
 */
MahjongGameModule.prototype.sendOperations = function(room, player, target_pai) {
    target_pai = parseInt(target_pai);

    if (this.hasOperations(player)) {
        if (target_pai === -1) {
            target_pai = player.holds[player.holds.length - 1];
        }

        var data = this.getPlayerChoices(room, player);
        data.target_pai = target_pai;

        // console.log('房间【', room.id, ' 第', room.round_no ,'回合 俱乐部: ', room.club_id,'】的玩家【', player.id , ' ', player.base_info.name, '】可以操作，他的手牌是', player.holds);

        // 推送给玩家(操作)
        room.sendMsg(player.id, CONST.PUSH.PLAYER_CHOICE_PUSH, data);
    } else {
        // 推送给玩家(出牌)
        room.sendMsg(player.id, CONST.PUSH.PLAYER_CHOICE_PUSH);
    }
};

/**
 * 移到下一个玩家操作
 *
 * @param room: 房间信息
 * @param next_index: 下一个玩家位置
 */
MahjongGameModule.prototype.moveToNextUser = function(room, next_index) {
    // 获取下一个玩家
    if (next_index == null) {
        // 刚开始, 由庄家摸牌
        if (room.turn === -1) {
            room.turn = room.button;
        } else {
            room.turn ++;
            room.turn %= room.player_count;
        }
    } else {
        room.turn = next_index;
    }

    room.chu_pai = -1;

    room.pushMessage(CONST.PUSH.PLAYER_TURN_PUSH, {
        turn: room.turn,
        remain_time: this.SPAN.OPERATION_LIMIT / 1000
    });

    // 时间到自动进入操作
    room.waiting_action = {
        timeout: false,
        remain_time: this.SPAN.OPERATION_LIMIT,
        handler: function() {
            // 暂时保留
        }
    };
};

/**
 * 玩家摸牌
 *
 * @param room
 */
MahjongGameModule.prototype.doMoPai = function(room) {
    var pai = this.mopai(room, room.turn);

    if (pai === -1) {
        this.delayRoundOver(room);
        // 牌摸完了, 结束
        return;
    }

    // 通知剩余牌数
    var remain_count = room.mahjongs.length - room.current_index;
    room.pushMessage(CONST.PUSH.MAHJONG_COUNT_PUSH, {
        remain_count: remain_count
    });

    // 记录出牌动作
    this.recordGameAction(room, room.turn, this.ACTION.MOPAI, pai);

    // 通知房间里所有人摸牌, 以及摸到的牌（只给本人）
    var turn_player = null;
    for (var i = 0; i < room.player_count; i++) {
        if (room.players[i].index === room.turn) {
            turn_player = room.players[i];
            break;
        }
    }
    // 除了轮子玩家之外, 所有玩家
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        type: this.ACTION.MOPAI,
        player_index: room.turn
    }, turn_player.id);
    // 轮子玩家另发送摸到的牌
    room.sendMsg(turn_player.id, CONST.PUSH.PLAYER_ACTION_PUSH, {
        type: this.ACTION.MOPAI,
        player_index: room.turn,
        pai: pai
    });

    // 让玩家来操作(可以自摸或弯杠)
    this.doUserTurn(room, true);
};

/**
 * 轮到玩家, 让他来操作
 *
 * @param room: 房间信息
 * @param did_mopai: 是否摸到了牌
 */
MahjongGameModule.prototype.doUserTurn = function(room, did_mopai) {
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  玩家操作相关(2)
//
//  doAction:                   玩家操作
//
//  doChi:                      玩家吃牌
//  doPeng:                     玩家碰牌
//  doGang:                     玩家杠牌（只是动画 + 音效）
//  _doGang:                    玩家杠牌（实际操作）
//  doTing:                     玩家听牌
//  doHu:                       玩家胡牌
//  doChuPai:                   玩家出牌
//
//  undoTurnFolds:              撤销轮子出的牌
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 玩家操作
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param action: 玩家操作
 */
MahjongGameModule.prototype.doAction = function(room, player, action) {
    GameModule.prototype.doAction.call(this, room, player, action);

    switch (action.type) {
        case this.ACTION.CHI:
            this.doChi(room, player, action.pais);
            break;

        case this.ACTION.PENG:
            this.doPeng(room, player);
            break;

        case this.ACTION.GANG:
            this.doGang(room, player, action.pais, action.gang_type);
            break;

        case this.ACTION.TING:
            this.doTing(room, player, action.pai);
            break;

        case this.ACTION.HU:
            this.doHu(room, player);
            break;

        case this.ACTION.CHU_PAI:
            this.doChuPai(room, player, action.pai);
            break;
        case this.ACTION.VIEW_PAI:
            this.doViewPai(room, player);
            break;
    }
};

MahjongGameModule.prototype.doViewPai = function(room, player) {
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
 * 玩家吃牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pais: 吃的牌组
 *  0: n, n+1, n+2
 *  1: n-1, n, n+1
 *  2: n-2, n-1, n
 */
MahjongGameModule.prototype.doChi = function(room, player, pais) {
    if (player.can_chi === false) {
        return;
    }

    var index = -1;
    var i;
    for (i = 0; i < pais.length; i++) {
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

        if (other_player.can_hu || other_player.can_gang || other_player.can_peng) {
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
MahjongGameModule.prototype.doPeng = function(room, player) {
    if (player.can_peng === false) {
        return;
    }

    // 如果有人可以胡牌, 则等待
    for (var i = 0; i < room.player_count; i++) {
        if (room.players[i].index === player.index) {
            continue;
        }

        if (room.players[i].can_hu) {
            return;
        }
    }

    // 验证手牌数目
    var pai = room.chu_pai;
    var qiang_peng = false;
    if(pai === -1) {
        if (room.qiangpeng_context.is_valid === true) {
            pai = room.qiangpeng_context.pai;
            room.qiangpeng_context.is_valid = false;
            var index = room.qiangpeng_context.player.holds.indexOf(pai);
            room.qiangpeng_context.player.holds.splice(index, 1);
            room.qiangpeng_context.player.count_map[pai] --;
            qiang_peng = true;
        }
    }
    if (player.count_map[pai] < 2) {
        return;
    }

    // 清理所有等待操作
    this.clearAllOptions(room);

    // 从手牌中删除
    for (i = 0; i < 2; i++) {
        var index = player.holds.indexOf(pai);
        player.holds.splice(index, 1);
        player.count_map[pai] --;
    }


    // 添加到碰牌
    player.pengs.push(pai);

    // 撤销轮子玩家的folds
    this.undoTurnFolds(room);

    if(qiang_peng === true) {
        // 做记录
        this.recordGameAction(room, player.index, this.ACTION.PENG, pai);

        // 广播给大家
        room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
            peng_gang: true,
            gang_player_index:  room.qiangpeng_context.player.index,
            player_index: player.index,
            type: this.ACTION.PENG,
            pai: pai
        });
    } else {
        // 做记录
        this.recordGameAction(room, player.index, this.ACTION.PENG, pai);

        // 广播给大家
        room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
            player_index: player.index,
            type: this.ACTION.PENG,
            pai: pai
        });
    }

    // 轮到碰牌玩家
    this.moveToNextUser(room, player.index);

    // 让玩家操作
    this.doUserTurn(room);
};

/**
 * 玩家杠牌（只是动画 + 音效）
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pai: 要杠的牌
 */
MahjongGameModule.prototype.doGang = function(room, player, pai) {
    pai = parseInt(pai);
    if (player.can_gang === false) {
        return;
    }

    if (player.gang_pais.indexOf(pai) === -1) {
        return;
    }

    // 如果有人可以胡牌(或已胡牌), 则等待
    for (var i = 0; i < room.player_count; i++) {
        if (room.players[i].index === player.index) {
            continue;
        }

        if (room.players[i].can_hu) {
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

    if (count === 1) {
        // 【碰杠】 - 检查是否可以被抢杠
        var can_qianggang = this.checkCanQiangGang(room, player, pai);
        if (can_qianggang) {
            return;
        }
    }

    this._doGang(room, player, pai);
};

/**
 * 玩家杠牌（实际操作）
 *
 * @param room
 * @param player
 * @param pai
 * @private
 */
MahjongGameModule.prototype._doGang = function(room, player, pai) {
    var count = player.count_map[pai];
    var gang_type;
    var index;

    switch (count) {
        case 1: // 碰杠
            gang_type = mj_util.GANG_TYPE.PENG_GANG;
            this.recordGangScore(room, player, gang_type, -1);
            break;
        case 3: // 明杠
            gang_type = mj_util.GANG_TYPE.MING_GANG;
            if (room.players[room.turn].is_ting) {
                // 如果点杠玩家, 听牌之后点的杠, 需要和大家一起付
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
    for (var i = 0; i < count; i++) {
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

    // 撤销轮子玩家的folds
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
MahjongGameModule.prototype.doTing = function(room, player, pai) {
    pai = parseInt(pai);
    if (player.can_ting === false) {
        return;
    }

    if (! player.bao_ting_maps[pai]) {
        return;
    }

    // 已经在听牌
    if (player.is_ting) {
        return;
    }

    // 金牌不能盖住
    if (room.jin_pais.indexOf(pai) !== -1) {
        return;
    }

    // 不在手牌
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

    // 加到folds(-1)
    // 听牌不显示的话加-1，显示听牌的话加pai
    //player.folds.push(-1);
    player.folds.push(pai);

    // 报听的牌
    player.bao_ting_pai = pai;
    // 是在听牌
    player.is_ting = true;

    // 刷新ting_map
    player.ting_map = player.bao_ting_maps[pai];

    // 清理用户的操作
    this.clearAllOptions(room, player);

    // console.log('房间【', room.id, ' 第', room.round_no ,'回合 俱乐部: ', room.club_id,'】的玩家【', player.id , ' ', player.base_info.name, '】报听了，听的牌是', pai ,'手牌是: ', player.holds);

    // 记录动作
    this.recordGameAction(room, player.index, this.ACTION.TING, pai);

    // 通知给大家有人【听】
    room.pushMessage(CONST.PUSH.PLAYER_ACTION_PUSH, {
        type: this.ACTION.TING,
        player_index: player.index,
        pai: pai
    });

    room.chu_pai = pai;
    // 则向下一家发牌，并通知他出牌
    this.moveToNextUser(room);
    this.doMoPai(room);
};

/**
 * 玩家胡牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.doHu = function(room, player) {
};

/**
 * 玩家过牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 */
MahjongGameModule.prototype.doGuo = function(room, player) {
};

/**
 * 玩家出牌
 *
 * @param room: 房间信息
 * @param player: 玩家信息
 * @param pai: 出的牌
 */
MahjongGameModule.prototype.doChuPai = function(room, player, pai) {
};

/**
 * 撤销轮子出的牌
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.undoTurnFolds = function(room) {
    if (room.chu_pai >= 0) {
        var turn_player = room.players[room.turn];

        if (mj_util.isJinPai(room.jin_pais, room.chu_pai)) {
            turn_player.jin_folds.pop();
        } else {
            turn_player.folds.pop();
        }
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  游戏结算相关
//
//  calculateRoundResult:           计算回合结果
//  recordRoundResultToPlayers:     回合信息记录到玩家, 并准备通知给客户端的玩家信息
//  decideNextRoundButton:          决定下一局庄家
//
//  showTotalResult:                推送游戏最终结果
//
//  delayRoundOver:                 延迟结算
//  doRoundOver:                    一回合结束了
//
//  saveRound:                      保存回合
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 计算回合结果
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.calculateRoundResult = function(room) {
    return [];
};

/**
 * 回合信息记录到玩家, 并准备通知给客户端的玩家信息
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.recordRoundResultToPlayers = function(room) {
    var result_data = [];
    var round_result = room.round_result;
    for (var i = 0; i < room.players.length; i++) {
        var player = room.players[i];

        player.is_ready = false;

        // 下面信息只需要在服务端统计, 不需要通知给前端
        player.score += round_result[i].score;                                                                         //  总分数
        player.num_zimo += round_result[i].num_zimo;                                                                   //  自摸次数
        player.num_dianpaohu += round_result[i].num_dianpaohu;                                                         //  点炮胡次数
        player.num_shangjiajiechu += round_result[i].num_shangjiajiechu;                                               //  上架皆出次数
        player.num_peijin = round_result[i].num_peijin;                                                                //  陪金次数
        player.num_dianpao += round_result[i].num_dianpao;                                                             //  点炮次数
        player.num_qianggang += round_result[i].num_qianggang;                                                         //  抢杠次数
        player.num_beiqianggang += round_result[i].num_beiqianggang;                                                   //  被抢杠次数
        player.num_minggang += round_result[i].num_minggang;                                                           //  明杠次数
        player.num_angang += round_result[i].num_angang;                                                               //  暗杠次数
        player.num_penggang += round_result[i].num_penggang;                                                           //  碰杠次数

        // result_data是需要通知给前端
        result_data[i] = this.getPlayerData(room, player);
    }

    return result_data;
};

/**
 * 决定下一局庄家
 *
 * @param room: 房间信息
 */
MahjongGameModule.prototype.decideNextRoundButton = function(room) {
};

/**
 * 推送游戏最终结果
 *
 * @param room: 房间信息
 * @param force_exit: 是否强行退出
 */
MahjongGameModule.prototype.showTotalResult = function(room, force_exit) {
    //  如果结束了，推送总统计
    var total_result = [];
    for(var i = 0; i < room.players.length; ++i){
        var player = room.players[i];

        total_result.push({
            id: player.base_info.id,
            name: player.base_info.name,
            avatar: player.base_info.avatar,

            score: player.score,
            num_zimo: player.num_zimo,
            num_dianpaohu: player.num_dianpaohu,
            num_dianpao: player.num_dianpao,
            num_shangjiajiechu: player.num_shangjiajiechu,
            num_peijin: player.num_peijin,
            num_qianggang: player.num_qianggang,
            num_beiqianggang: player.num_beiqianggang,
            num_minggang: player.num_minggang,
            num_angang: player.num_angang,
            num_penggang: player.num_penggang
        });
    }

    room.room_result = total_result;

    //  推送游戏结果数据
    room.pushMessage(CONST.PUSH.GAME_FINISHED_PUSH, {
        players: total_result,
        time: UTIL.getTimeDesc(),
        force_exit: force_exit
    });

    room.finishGame(force_exit);
};

/**
 * 延迟结算
 *
 * @param room: 房间信息
 * @param force_exit: 是否强制退出
 */
MahjongGameModule.prototype.delayRoundOver = function(room, force_exit) {
    var self = this;
    room.waiting_action = {
        timeout: true,
        remain_time: this.SPAN.HU_PAI,
        handler: function () {
            self.doRoundOver(room, force_exit);
        }
    };
};

/**
 * 一回合结束了
 *
 * @param room: 房间信息
 * @param force_exit: 是否强制结束（解散房间）
 */
MahjongGameModule.prototype.doRoundOver = function(room, force_exit) {
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
        this.saveRound(room, function (err) {
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

                // 达到最大回合数, 算正常解散房间, 要推送给大厅
                // room.notifyRoomDissolve(room.id, CONST.REASON.FINISH_DISSOLVED);
            } else {
                // 决定下一局庄家
                self.decideNextRoundButton(room);

                // 设置庄家
                room.button = room.next_button;

                // 游戏状态改为ready
                room.game_status = CONST.GAME_STATUS.WAITING;
            }
        });
    }
};

/**
 * 保存回合信息
 *
 */
MahjongGameModule.prototype.saveRound = function(room, callback) {
    callback = callback || function() {};

    // 插入用户信息
    for (var i = 0; i < room.player_count; i++) {
        var player = room.players[i];

        if (player) {
            room.round_result[i].id = player.base_info.id;
            room.round_result[i].name = player.base_info.name;
            room.round_result[i].avatar = player.base_info.avatar;
            room.round_result[i].patterns = player.patterns;
            room.round_result[i].jin_folds = player.jin_folds;
            room.round_result[i].fan = player.fan;
        }
    }

    room.roundOver(callback);
};

///////////////////////////////////////////////////////////////////////////
//
//  其他
//
//  update:                 执行游戏逻辑
//
///////////////////////////////////////////////////////////////////////////

/**
 * 执行游戏逻辑
 *
 * @param game_room: 房间信息
 * @param dt
 */
MahjongGameModule.prototype.update = function(game_room, dt) {
    if (! game_room || game_room.status === CONST.ROOM_STATUS.FINISHED) {
        return;
    }

    // 执行等待的操作
    var action = game_room.waiting_action;
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

module.exports = MahjongGameModule;