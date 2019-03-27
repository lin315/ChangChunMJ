/**
 * Created by leo on 7/9/2018.
 */

var Event = module_manager.getModule(CONST.MODULE.EVENT);
var GameRoom = require('./game_room');
var GameModule = require('./poker/doudizhu');

var MatchField = function(game_engine, match_field) {
    // 初始化系统服务
    this.game_engine = game_engine;
    this.game_module = GameModule;
    this.connections = [];

    // 玩家状态
    this.PLAYER_STATUS = {
        READY_TO_START: 'ready_to_start',                                                                               //  准备就绪
        WAITING_OTHER_ROOMS_FINISHED: 'waiting_other_rooms_finished',                                                   //  等待其他桌子结束
        PLAYING: 'playing',                                                                                             //  游戏中
        PROMOTED: 'promoted',                                                                                           //  晋级
        ELIMINATED: 'eliminated'                                                                                        //  被淘汰
    };

    // 等待时间
    this.SPAN = {
        RANKING_SHOW_TIME: 20000                                                                                        //  排名显示时间(之后自动进入下一场游戏)
    };

    // 比赛场默认选项
    this.ROOM_SETTINGS = {
        game_id: CONST.GAME_ID.DOUDIZHU,
        type: CONST.ROOM_TYPE.MATCH,
        club_id: 0,
        club_room_setting_id: 0,
        match_field_id: match_field.id,
        settings: {
            round_count: 1,
            player_count: 3,
            play_method: this.game_module.CONSTANT.PLAY_METHOD.NORMAL,
            feng_ding: 7,
            zha_dan: this.game_module.CONSTANT.ZHA_DAN.JIABEI,
            has_no_3_dai_2: false,
            has_4_dai_2: true
        },
        creator: 0,
        needed_gems: 0,
        max_player_count: 3
    };

    // 初始化比赛场信息
    this.id = match_field.id;                                                                                           //  比赛场ID(日赛: day14 - 14:00 开赛, 月赛: month)
    this.type = match_field.type;                                                                                       //  比赛场类型(日赛/周赛)
    this.start_hour_in_24 = match_field.start_hour_in_24;                                                               //  开赛时间(13点)
    this.status = CONST.MATCH_FIELD_STATUS.WAITING;                                                                     //  比赛场状态
    this.round_no = match_field.round_no;                                                                               //  第几轮
    this.created_at = match_field.created_at;

    // 比赛场内部信息
    this.score_boards = [];                                                                                             //  计分板(玩家ID, 排名, 分数, 轮次, 状态[等待中/游戏中/被淘汰])
    this.game_rooms = {};                                                                                               //  比赛场房间列表
    this.system_settings = {};                                                                                          //  系统设置

    this.waiting_action = null;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  比赛场相关
    //
    //  open:                           打开比赛场
    //  startMatch:                     开赛
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 打开比赛场
     *
     * @param match_entry_forms: 报名列表
     * @param settings: 系统设置
     */
    this.open = function(match_entry_forms, settings) {
        if (this.status !== CONST.MATCH_FIELD_STATUS.WAITING) {
            return;
        }

        // 更新系统设置参数
        this.system_settings = settings;
        this.ROOM_SETTINGS.settings.round_count = settings.match_round_count;

        // 1. 初始化计分板
        this.score_boards = [];
        for (var i = 0; i < match_entry_forms.length; i++) {
            this.score_boards.push({
                user_id: match_entry_forms[i].user_id,
                ranking: (i + 1),
                score: settings.match_field_init_score,
                round_no: 0,
                status: this.PLAYER_STATUS.READY_TO_START
            });
        }

        // 2. 开赛
        this.startMatch();
    };

    /**
     * 开赛
     *
     */
    this.startMatch = function() {
        var self = this;
        var channel_service = game_engine.app.get('channelService');
        var candidate_groups = [];

        // 初始化比赛场操作
        this.waiting_action = null;

        // 更新状态
        this.status = CONST.MATCH_FIELD_STATUS.PLAYING;
        // 增加回合
        this.round_no ++;

        // 保存比赛场信息
        this.saveModel();

        var assignPlayer = function(game_room, user_id, seat_index) {
            UserModel.getByID(user_id, function (err, user) {
                if (err || !user) {
                    return;
                }

                // 通过大厅推送给玩家, 让玩家进入比赛场房间
                Event.emit(CONST.EVENT.MATCH_ROOM_CREATED, {
                    user_id: user_id,
                    data: {
                        match_field_id: game_room.match_field_id,
                        room_id: game_room.id
                    }
                });

                // 分配玩家到座位
                game_room.playerSit(user, null, seat_index, function (err, result) {
                    // 更新计分板
                    var score_board = self.getPlayerScoreBoard(user.id);
                    if (score_board) {
                        score_board.round_no = self.round_no;
                        score_board.status = self.PLAYER_STATUS.PLAYING;
                    }
                });
            });
        };

        var assignPlayers = function() {
            var i = 0;
            for (var room_id in self.game_rooms) {
                var game_room = self.game_rooms[room_id];
                var candidate_group = candidate_groups[i];

                for (var index = 0; index < 3; index ++) {
                    assignPlayer(game_room, candidate_group[index], index);
                }

                i++;
            }
        };

        // 准备一桌的玩家组合
        var fillRobots = function(callback) {
            var player_count = self.getScoreBoardPlayerCount(self.PLAYER_STATUS.READY_TO_START);
            var needed_robot_count;
            if (self.round_no === 1 && player_count < 6) {
                // 一开始至少要6个玩家
                needed_robot_count = 6 - player_count;
            } else {
                needed_robot_count = (3 - player_count % 3) % 3;
            }

            UserModel.getIdleRobots(needed_robot_count, function(err, robots) {
                if (err) {
                    return callback(err);
                }

                if (needed_robot_count !== robots.length) {
                    // 机器人要足够多
                    return callback(new Error(ERROR.NO_IDLE_ROBOTS));
                }

                for (var i = 0; i < needed_robot_count; i++) {
                    self.score_boards.push({
                        user_id: robots[i].id,
                        ranking: 0,
                        score: self.system_settings.match_field_init_score,
                        round_no: self.round_no,
                        status: self.PLAYER_STATUS.READY_TO_START
                    });
                }

                // 填补机器人完毕
                callback(null);
            });
        };
        fillRobots(function(err) {
            if (err) {
                console.log('填补机器人失败', err);
                return;
            }

            var needed_room_count = self.getNeededRoomCount();
            var score_board_index = 0;
            var matched_room_count = 0;
            var candidate_group = [];
            var candidate_count = 0;

            while (score_board_index < self.score_boards.length) {
                var score_board = self.score_boards[score_board_index];

                if (score_board.status === self.PLAYER_STATUS.READY_TO_START) {
                    if (candidate_count < 3) {
                        candidate_count ++;
                        candidate_group.push(score_board.user_id);
                    }

                    if (candidate_count === 3) {
                        matched_room_count ++;
                        candidate_count = 0;
                        candidate_groups.push(candidate_group);
                        candidate_group = [];
                    }
                }

                score_board_index ++;
            }

            // 分配玩家到指定房间
            var created_room_count = 0;
            for (var i = 0; i < needed_room_count; i++) {
                self.ROOM_SETTINGS.match_round_no = self.round_no;
                RoomModel.createRoom(self.ROOM_SETTINGS, game_engine.server_id, function(err, room) {
                    if (err) {
                        console.log('创建比赛场房间失败', err);
                        return;
                    }

                    var game_room = new GameRoom(game_engine, self, channel_service, room, self.game_module);
                    self.game_rooms[game_room.id] = game_room;
                    game_engine.game_rooms[game_room.id] = game_room;

                    // 计数
                    created_room_count ++;

                    if (created_room_count === needed_room_count) {
                        // 房间创建完毕, 开始分配玩家
                        assignPlayers();
                    }
                });
            }
        });
    };

    /**
     * 结束比赛
     *
     */
    this.finishMatch = function() {
        if (this.status === CONST.MATCH_FIELD_STATUS.FINISHED) {
            return;
        }

        // 更新状态
        this.status = CONST.MATCH_FIELD_STATUS.FINISHED;

        // 保存比赛场
        this.saveModel();

        // 保存前三名玩家
        for (var i = 0; i < this.score_boards.length; i++) {
            var score_board = this.score_boards[i];

            if (score_board.status === this.PLAYER_STATUS.PROMOTED) {
                this.saveWinnerScoreboard(score_board);
            }
        }

        // 清理玩家的比赛场, 房间信息
        for (i = 0; i < this.score_boards.length; i++) {
            UserModel.clearRoomID(this.score_boards[i].user_id, true);
        }
    };

    this.saveWinnerScoreboard = function(score_board) {
        var self = this;

        UserModel.getByID(score_board.user_id, function(err, user) {
            if (err || ! user) {
                console.log('获取比赛场赢家【' + (score_board.user_id) + '】失败');
                return;
            }

            // 奖励写到notes
            var bonus = '';
            if (self.type === CONST.MATCH_TYPE.DAY) {
                // 日赛
                if (score_board.ranking === 1) {
                    bonus = self.system_settings.day_match_champion_award;
                } else if (score_board.ranking === 2) {
                    bonus = self.system_settings.day_match_second_place_award;
                } else if (score_board.ranking === 3) {
                    bonus = self.system_settings.day_match_third_place_award;
                }
            } else {
                // 周赛
                if (score_board.ranking === 1) {
                    bonus = self.system_settings.week_match_champion_award;
                } else if (score_board.ranking === 2) {
                    bonus = self.system_settings.week_match_second_place_award;
                } else if (score_board.ranking === 3) {
                    bonus = self.system_settings.week_match_third_place_award;
                }
            }

            MatchWinnerModel.create({
                match_field_id: self.id,
                match_field_type: self.type,
                match_field_start_hour_in_24: self.start_hour_in_24,
                user_id: score_board.user_id,
                user_name: user.name,
                is_robot: user.is_robot,
                ranking: score_board.ranking,
                bonus_awarded: false,
                notes: bonus + '元话费',
                created_at: UTIL.getTimeDesc()
            }, function(err, result) {
                if (err) {
                    console.log('保存比赛场【', self.id , '】赢家失败', err);
                }
            });
        });
    };

    /**
     * 保存比赛场信息
     *
     * @param callback
     */
    this.saveModel = function(callback) {
        callback = callback || function() {};

        var self = this;
        MatchFieldModel.lockAndGet(self.id, function(err, match_field) {
            if (err || ! match_field) {
                MatchFieldModel.unlock(self.id);
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            match_field.round_no = self.round_no;
            match_field.status = self.status;
            if (self.status === CONST.MATCH_FIELD_STATUS.FINISHED) {
                match_field.finished_at = UTIL.getTimeDesc();
            }

            MatchFieldModel.save(match_field, function(err, result) {
                MatchFieldModel.unlock(self.id);

                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                } else {
                    callback(null, result);
                }
            });
        });
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  房间相关
    //
    //  sitRoom:                        坐下比赛场房间
    //  getNeededRoomCount:             获取所需创建的房间数量
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 坐下比赛场房间
     *
     * @param user_id
     * @param connector_id
     * @param room_id
     */
    this.sitRoom = function(user_id, connector_id, room_id) {
        var self = this;

        UserModel.getByID(user_id, function(err, user) {
            if (err || ! user) {
                return;
            }

            // 创建Channel
            self.setConnection(user_id, connector_id);

            // 如果有效房间号, 进入
            var game_room = self.game_rooms[room_id];
            if (game_room) {
                self.game_module.canSitRoom(user, game_room, null, function(err, result) {
                    if (err) {
                        return;
                    }

                    game_room.playerSit(user, connector_id, result, function(err, result) {});
                });
            } else {
                // 查无此房间, 清空用户房间
                UserModel.clearRoomID(user_id, false);

                var score_board = self.getPlayerScoreBoard(user_id);
                self.sendScoreBoardResult(score_board);
            }
        });
    };

    /**
     * 获取所需创建的房间数量
     *
     */
    this.getNeededRoomCount = function() {
        var ready_player_count = 0;
        for (var i = 0; i < this.score_boards.length; i++) {
            var score_board = this.score_boards[i];

            if (score_board.status === this.PLAYER_STATUS.READY_TO_START) {
                // 只计数【准备就绪】的玩家
                ready_player_count ++;
            }
        }

        return Math.ceil(ready_player_count / 3);
    };

    /**
     * 获取当前游戏房间数量
     *
     * @returns {number}
     */
    this.getGameRoomCount = function() {
        var count = 0;
        for (var room_id in this.game_rooms) {
            count ++;
        }

        return count;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  玩家相关
    //
    //  getPlayerScoreBoard:            获取比赛场玩家状态
    //  updateScoreboard:               更新计分板
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 获取晋级的玩家数量
     *
     * @param status
     * @returns {number}
     */
    this.getScoreBoardPlayerCount = function(status) {
        var count = 0;
        for (var i = 0; i < this.score_boards.length; i++) {
            var score_board = this.score_boards[i];

            if (score_board.status === status) {
                count ++;
            }
        }

        return count;
    };

    /**
     * 获取比赛场玩家状态
     *
     * @param user_id
     * @returns {*}
     */
    this.getPlayerScoreBoard = function(user_id) {
        for (var i = 0; i < this.score_boards.length; i++) {
            var score_board = this.score_boards[i];
            if (score_board.user_id === user_id) {
                return score_board;
            }
        }

        return null;
    };

    /**
     * 更新指定房间用户的计分板
     *
     * @param room
     */
    this.updateScoreBoard = function(room) {
        for (var i = 0; i < room.room_result.length; i++) {
            var result = room.room_result[i];
            var score_board = this.getPlayerScoreBoard(result.id);
            if (! score_board) {
                continue;
            }

            score_board.score = result.score;
            score_board.status = this.PLAYER_STATUS.WAITING_OTHER_ROOMS_FINISHED;
        }
    };

    /**
     * 计算排名
     *
     */
    this.calculateRanking = function() {
        var self = this;

        for (var i = 0; i < this.score_boards.length - 1; i++) {
            if (this.score_boards[i].status === this.PLAYER_STATUS.ELIMINATED) {
                // 淘汰的不计算排名
                continue;
            }

            for (var j = i + 1; j < this.score_boards.length; j++) {
                if (this.score_boards[j].status === this.PLAYER_STATUS.ELIMINATED) {
                    // 淘汰的不计算排名
                    continue;
                }

                if (this.score_boards[i].score < this.score_boards[j].score) {
                    var tmp = this.score_boards[i];
                    this.score_boards[i] = this.score_boards[j];
                    this.score_boards[j] = tmp;
                }
            }
        }

        var ranking = 0;
        for (i = 0 ; i < this.score_boards.length; i++) {
            var score_board = this.score_boards[i];
            if (score_board.status === this.PLAYER_STATUS.ELIMINATED) {
                // 淘汰的不计算排名
                continue;
            }

            // 更新排名, 状态
            ranking ++;
            score_board.ranking = ranking;
        }

        var threshold_ranking;
        if (ranking === 3) {
            // 最后三名
            threshold_ranking = 4;
        } else {
            // 淘汰一半(7人淘汰3人)
            threshold_ranking = Math.ceil(ranking / 2);
        }

        for (i = 0; i < this.score_boards.length; i++) {
            score_board = this.score_boards[i];
            if (score_board.status === this.PLAYER_STATUS.ELIMINATED) {
                // 淘汰的不计算排名
                continue;
            }

            if (score_board.ranking > threshold_ranking) {
                // 淘汰
                score_board.status = this.PLAYER_STATUS.ELIMINATED;
            } else {
                // 晋级
                score_board.status = this.PLAYER_STATUS.PROMOTED;
            }

            // 通知给每位参赛者
            this.sendScoreBoardResult(score_board, (ranking === 3));
        }

        // 用户查看自己的排名之后, 通过点击【继续】来报【准备】
        // 如果所有用户准备就绪, 则进入下一场比赛
        // 如果用户一段时间没有操作, 则自动开赛
        this.waiting_action = {
            timeout: true,
            remain_time: self.SPAN.RANKING_SHOW_TIME,
            handler: function () {
                if (ranking === 3) {
                    // 结束比赛场
                    self.finishMatch();
                } else {
                    // 所有玩家设为【准备】, 开始下一轮比赛
                    for (i = 0; i < self.score_boards.length; i++) {
                        score_board = self.score_boards[i];

                        if (score_board.status !== self.PLAYER_STATUS.ELIMINATED) {
                            score_board.status = self.PLAYER_STATUS.READY_TO_START;
                        }
                    }

                    self.startMatch();
                }
            }
        };
    };

    /**
     * 给指定的玩家通知计分板结果
     *
     * @param score_board
     * @param is_final: 是否最后牌局
     */
    this.sendScoreBoardResult = function(score_board, is_final) {
        if (! score_board) {
            return;
        }

        // 发送状态
        this.sendMsg(score_board.user_id, CONST.PUSH.MATCH_FIELD_PLAYER_STATUS_PUSH, {
            id: this.id,
            type: this.type,
            match_round_no: this.round_no,
            score: score_board.score,
            ranking: score_board.ranking,
            is_final: is_final,
            status: score_board.status
        });
    };

    /**
     * 通知房间内的玩家【等待其他桌子打完】
     *
     * @param room
     */
    this.sendScoreBoardWaitingResult = function(room) {
        for (var i = 0; i < room.player_count; i++) {
            var player = room.players[i];
            var score_board = this.getPlayerScoreBoard(player.base_info.id);
            this.sendScoreBoardResult(score_board);
        }
    };

    /**
     * 用户退出比赛场
     *
     * @param user_id
     * @param connector_id
     * @param callback
     */
    this.userQuitMatch = function(user_id, connector_id, callback) {
        callback = callback || function() {};
        var self = this;

        UserModel.getByID(user_id, function(err, user) {
            if (err || !user) {
                return callback(ERROR.INVALID_OPERATION);
            }

            var game_room = self.game_rooms[user.room_id];
            if (game_room) {
                return callback(ERROR.UNABLE_TO_QUIT_MATCH_WHILE_IN_ROOM);
            }

            // 1. 删除比赛场字段
            UserModel.clearRoomID(user_id, true, function(err, result) {
                if (err) {
                    return callback(ERROR.INVALID_OPERATION);
                }

                // 2. 删除计分板记录
                for (var i = 0; i < self.score_boards.length; i++) {
                    var score_board = self.score_boards[i];
                    if (score_board.user_id === user_id) {
                        self.score_boards.splice(i, 1);
                        break;
                    }
                }

                // 3. 删除用户连接
                self.removeConnection(user_id);

                return callback(null);
            });
        });
    };

    /**
     * 用户准备就绪
     *
     * @param user_id
     * @param connector_id
     * @param callback
     */
    this.userReady = function(user_id, connector_id, callback) {
        callback = callback || function() {};

        var score_board = this.getPlayerScoreBoard(user_id);

        // 只有【晋级】的玩家才可以准备
        if (score_board.status !== this.PLAYER_STATUS.PROMOTED) {
            return callback(ERROR.INVALID_PARAMS);
        }

        // 1. 更新连接
        this.setConnection(user_id, connector_id);

        // 2. 更新计分板
        score_board.status = this.PLAYER_STATUS.READY_TO_START;

        // 3. 通知玩家状态
        this.sendScoreBoardResult(score_board, false);

        // 4. 返回
        callback(null);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  客户端连接相关
    //
    //  sendMsg:                            向单个客户端推送消息
    //
    //  setConnection:                      设置用户的客户端连接
    //  removeConnection:                   删除用户的客户端连接
    //
    //  playerDisconnected:                 用户离线
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 向单个客户端推送消息
     *
     * @param {string} player_id 用户id
     * @param {String} route 信息类型
     * @param {Object} [data] 发给用户端的信息
     */
    this.sendMsg = function (player_id, route, data) {
        var connection = this.getConnection(player_id);
        if (! connection) {
            return;
        }

        if (data === undefined || data === null) {
            data = {};
        }

        //  发送消息
        var channel_service = game_engine.app.get('channelService');
        channel_service.pushMessageByUids(route, data, [connection], {}, function () {});
    };

    /**
     * 获取用户的客户端连接
     *
     * @param user_id: 用户ID
     * @returns {*}
     */
    this.getConnection = function(user_id) {
        for (var i = 0; i < this.connections.length; i++) {
            var connection = this.connections[i];
            if (connection.uid === user_id)
                return connection;
        }

        return null;
    };

    /**
     * 设置用户的客户端连接
     *
     * @param user_id: 用户ID
     * @param connector_id: connectorID
     * @returns {boolean}
     */
    this.setConnection = function(user_id, connector_id) {
        var connection;
        // 连接已存在, 需要更新
        for (var i = 0; i < this.connections.length; i++) {
            connection = this.connections[i];
            if (connection.uid === user_id) {
                connection.sid = connector_id;
                return true;
            }
        }

        // 不存在, 新增
        connection = {
            uid: user_id,
            sid: connector_id
        };

        this.connections.push(connection);
    };

    /**
     * 删除用户的客户端连接
     *
     * @param user_id: 用户ID
     * @returns {boolean}
     */
    this.removeConnection = function(user_id) {
        for (var i = 0; i < this.connections.length; i++) {
            var connection = this.connections[i];
            if (connection.uid === user_id) {
                this.connections.splice(i, 1);
                return true;
            }
        }

        return false;
    };

    /**
     * 用户离线
     *
     * @param user_id
     */
    this.playerDisconnected = function(user_id) {
        for (var room_id in this.game_rooms) {
            var game_room = this.game_rooms[room_id];

            if (! game_room) {
                continue;
            }

            game_room.playerDisconnected(user_id);
        }

        // 删除客户端连接
        this.removeConnection(user_id);
    };

    /**
     * 定期执行
     *
     * @param dt
     */
    this.update = function(dt) {
        var action = this.waiting_action;
        if (action && action.remain_time > 0) {
            action.remain_time -= dt;
            if (action.remain_time <= 0) {
                action.remain_time = 0;

                if (action.timeout) {
                    action.handler();
                }
            }
        }

        // 删除已结束的房间
        for (var room_id in this.game_rooms) {
            if (! this.game_rooms.hasOwnProperty(room_id)) {
                continue;
            }

            var game_room = this.game_rooms[room_id];
            if (game_room.status === CONST.ROOM_STATUS.FINISHED) {
                console.log('match_field 房间【', room_id , '】结束, 要删除~');
                delete this.game_rooms[room_id];
            }
        }

    };
};

module.exports = MatchField;