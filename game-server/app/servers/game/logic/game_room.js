/**
 * Created by leo on 11/8/2017.
 */

var Event = module_manager.getModule(CONST.MODULE.EVENT);

var GameRoom = function(game_engine, match_field, channel_service, room, game_module) {
    var DISSOLVE_TIME = 300;                                                                                            //  单位为s
    var IDLE_DISSOLVE_TIME = 120;                                                                                       //  单位为分钟: 房间创建，游戏并未开始，自动解散的时间

    // 初始化系统服务
    this.game_engine = game_engine;
    this.match_field = match_field;
    this.channel_service = channel_service;
    this.game_module = game_module;
    this.connections = [];

    // 初始化房间信息
    this.id = room.id;
    this.game_id = room.game_id;
    this.type = room.type;
    this.club_id = room.club_id;                                                                                        //  俱乐部ID(俱乐部房间), null(其他房间)
    this.club_room_setting_id = room.club_room_setting_id;                                                              //  俱乐部创建选项ID(俱乐部房间)
    this.match_field_id = room.match_field_id;                                                                          //  比赛场ID
    this.match_round_no = room.match_round_no;                                                                          //  比赛场第几回合房间
    this.status = CONST.ROOM_STATUS.WAITING;
    this.round_no = room.round_no;
    this.created_at = room.created_at;
    this.settings = room.settings;
    this.max_player_count = room.max_player_count;
    this.creator = room.creator;
    this.needed_gems = room.needed_gems;

    // 游戏内部信息
    this.game_status = CONST.GAME_STATUS.WAITING;
    this.player_count = 0;
    this.players = new Array(this.max_player_count);
    this.spectators = [];
    this.room_result = null;                                                                                           //  当前房间的游戏记录
    this.round_info = null;                                                                                            //  这一局信息
    this.round_result = [];                                                                                             //  这一局的分数
    this.round_over_time = 0;                                                                                           //  回合结束时间
    this.action_list = [];                                                                                              //  玩家的操作记录

    this.button = -1;                                                                                                   //  当前庄家
    this.next_button = -1;                                                                                              //  下一轮庄家
    this.turn = -1;                                                                                                     //  轮到谁来出牌

    this.waiting_action = null;
    this.dissolve_data = null;

    // 让子游戏模块自定义初始化
    this.game_module.initRoom(this);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  房间信息相关
    //
    //  getData:                获取房间基本信息
    //
    //  isPrivateRoom:          是否私人房间
    //  isClubRoom:             是否俱乐部房间
    //
    //  saveModel:              保存房间信息
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 获取房间基本信息
     *
     * @returns {Object} 房间信息
     */
    this.getData = function() {
        var data = {};

        data.id = this.id;
        data.game_id = this.game_id;
        data.type = this.type;
        data.club_id = this.club_id;
        data.club_room_setting_id = this.club_room_setting_id;
        data.match_field_id = this.match_field_id;
        data.status = this.status;
        data.round_no = this.round_no;
        data.settings = this.settings;
        data.max_player_count = this.max_player_count;
        data.creator = this.creator;

        data.game_status = this.game_status;
        data.player_count = this.player_count;

        // 插入玩家信息
        data.players = this.getPublicPlayers();

        data.turn = this.turn;
        data.button = this.button;

        data.dissolve_data = this.dissolve_data;
        data.created_at = this.created_at;
        if (! this.waiting_action || ! this.waiting_action.remain_time) {
            data.remain_time = 0;
        } else {
            data.remain_time = this.waiting_action.remain_time / 1000;
        }

        return data;
    };

    /**
     * 是否私人房间
     *
     * @returns {boolean}
     */
    this.isPrivateRoom = function() {
        return (this.type === CONST.ROOM_TYPE.PRIVATE);
    };

    /**
     * 是否俱乐部房间
     *
     * @returns {boolean}
     */
    this.isClubRoom = function() {
        return (this.type === CONST.ROOM_TYPE.CLUB);
    };

    /**
     * 是否比赛场房间
     *
     * @returns {boolean}
     */
    this.isMatchFieldRoom = function() {
        return (this.type === CONST.ROOM_TYPE.MATCH) && (this.match_field !== null);
    };

    /**
     * 保存房间信息
     *
     * @param callback
     */
    this.saveModel = function(callback) {
        callback = callback || function() {};

        var self = this;
        RoomModel.lockAndGet(self.id, function(err, room) {
            if (err || ! room) {
                RoomModel.unlock(self.id);
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            var player_ids = [];
            for (var i = 0; i < self.players.length; i++) {
                if (self.players[i]) {
                    player_ids.push(self.players[i].id);
                } else {
                    player_ids.push(0);
                }
            }

            room.players = player_ids;
            room.status = self.status;
            room.round_no = self.round_no;
            room.creator = self.creator;
            if (self.room_result) {
                room.result = self.room_result;
                room.finished_at = UTIL.getTimeDesc();
            }

            RoomModel.save(room, function(err, result) {
                RoomModel.unlock(self.id);

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
    //  玩家操作
    //
    //  playerEnter:        用户加入房间（旁观）
    //  playerSit:          用户加入房间（坐下）
    //  playerLeave:        玩家离开房间
    //  playerDisconnected: 玩家离线
    //
    //  doAction:           玩家进行游戏操作
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 用户加入房间（旁观）
     *
     * @param user
     * @param connector_id
     * @param callback
     */
    this.playerEnter = function(user, connector_id, callback) {
        var spectators = this.spectators;

        // 不在旁观者队列
        if (! this.isSpectator(user.id)) {
            // 添加到旁观者队列
            spectators.push(user.id);
        }

        // 创建Channel
        this.setConnection(user.id, connector_id);

        // 同步游戏信息
        this.game_module.syncGameData(this, user.id);

        callback(null, true);
    };

    /**
     * 用户加入房间（坐下）
     *
     * @param user: 用户信息
     * @param connector_id: connectorID
     * @param seat_index: 座位Index
     * @param callback
     * @returns {*}
     */
    this.playerSit = function(user, connector_id, seat_index, callback) {
        var self = this;
        if (! (seat_index >= 0 && seat_index < this.max_player_count)) {
            return callback(new Error(ERROR.INVALID_SEAT_NO));
        }

        var player = this.players[seat_index];
        if (player) {
            if (player.id === user.id) {
                // 玩家已经在此位置
                player.is_online = true;
            } else {
                // 已经有玩家
                return callback(new Error(ERROR.SIT_ALREADY_TAKEN));
            }
        } else {
            // 如果房间满了
            if (this.player_count >= this.max_player_count) {
                return callback(new Error(ERROR.ROOM_IS_FULL));
            }

            // 游戏已经开始, 不能坐下
            if (this.game_status !== CONST.GAME_STATUS.WAITING) {
                return callback(new Error(ERROR.ROOM_IS_FULL));
            }

            // 指定位置, 可以坐下, 新增玩家信息
            var base_info = UserModel.getBaseInfo(user);
            player = this.players[seat_index] = {};

            player.base_info = base_info;
            player.index = seat_index;
            player.id = user.id;
            player.is_online = true;
            player.is_ready = false;
            player.is_robot = user.is_robot;

            if (this.isMatchFieldRoom()) {
                var score_board = match_field.getPlayerScoreBoard(player.id);
                player.score = score_board.score;
            } else {
                player.score = 0;
            }

            this.player_count ++;

            // 不同子游戏, 不同初始化
            this.game_module.initPlayer(this, player);
        }

        var player_data = this.game_module.getPlayerData(this, player);

        UserModel.lockAndGet(user.id, function(err, user_info) {
            if (err || ! user_info) {
                UserModel.unlock(user.id);
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            // 保存用户的房间号
            user.room_id = self.id;

            // 比赛场房间, 保存比赛场ID
            user.match_field_id = self.match_field_id;

            UserModel.save(user, function(err, result) {
                UserModel.unlock(user.id);

                if (err || ! result) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 保存房间信息
                self.saveModel();

                // 通知给大家
                self.pushMessage(CONST.PUSH.PLAYER_SIT_PUSH, player_data);

                // 创建Channel
                if (connector_id !== null) {
                    self.setConnection(player.id, connector_id);
                }

                if (self.status === CONST.ROOM_STATUS.WAITING || self.game_status === CONST.GAME_STATUS.PLAYING) {
                    // 游戏房间开局前 + 游戏中, 自动设置为ready
                    //self.game_module.doReady(self, player);
                }

                // 同步游戏信息
                self.game_module.syncGameData(self, player.id);

                callback(null, seat_index);
            });
        });
    };

    /**
     * 玩家离开房间
     *
     * @param user_id: 用户ID
     * @param callback
     * @returns {*}
     */
    this.playerLeave = function(user_id, callback) {
        callback = callback || function() {};

        var player = this.getPlayer(user_id);

        // 如果是旁观者
        if (! player && this.isSpectator(user_id)) {
            // 从旁观者队列删除
            this.removeFromSpectator(user_id);

            // 通知其他玩家
            this.pushMessage(CONST.PUSH.PLAYER_LEAVE_PUSH, user_id);

            // 删除客户端连接
            this.removeConnection(user_id);

            // 通知房间信息给大厅的旁观者（大厅房间列表用）
            // this.game_engine.notifyRoomInfo(this.id);

            return callback(null);
        }

        if (! player) {
            return callback(null);
        }

        // 游戏中无法离开
        if (this.hasBegan()) {
            return callback(new Error(ERROR.CAN_NOT_LEAVE_WHEN_PLAYING));
        }

        // 删除用户信息
        this.players[player.index] = null;
        this.player_count --;
        if (this.player_count < 0) {
            this.player_count = 0;
        }

        this.saveModel();

        // 通知其他玩家
        this.pushMessage(CONST.PUSH.PLAYER_LEAVE_PUSH, player.id);

        // 删除客户端连接信息
        this.removeConnection(player.id);

        // 删除玩家的房间信息
        if (! this.isMatchFieldRoom()) {
            UserModel.clearRoomID(player.id, false, function (err) {
                callback(null);
            });
        }
    };

    /**
     * 玩家离开房间
     *
     * @param user_id: 用户ID
     * @param callback
     * @returns {*}
     */
    this.playerLeave = function(user_id, callback) {
        callback = callback || function() {};

        var player = this.getPlayer(user_id);

        // 如果是旁观者
        if (! player && this.isSpectator(user_id)) {
            // 从旁观者队列删除
            this.removeFromSpectator(user_id);

            // 通知其他玩家
            this.pushMessage(CONST.PUSH.PLAYER_LEAVE_PUSH, user_id);

            // 删除客户端连接
            this.removeConnection(user_id);

            // 通知房间信息给大厅的旁观者（大厅房间列表用）
            // this.game_engine.notifyRoomInfo(this.id);

            return callback(null);
        }

        if (! player) {
            return callback(null);
        }

        // 游戏中无法离开
        if (this.hasBegan()) {
            return callback(new Error(ERROR.CAN_NOT_LEAVE_WHEN_PLAYING));
        }

        // 删除用户信息
        this.players[player.index] = null;
        this.player_count --;
        if (this.player_count < 0) {
            this.player_count = 0;
        }

        this.saveModel();

        // 通知其他玩家
        this.pushMessage(CONST.PUSH.PLAYER_LEAVE_PUSH, player.id);

        // 删除客户端连接信息
        this.removeConnection(player.id);

        // 删除玩家的房间信息
        if (! this.isMatchFieldRoom()) {
            UserModel.clearRoomID(player.id, false, function (err) {
                callback(null);
            });
        }
    };

    /**
     * 玩家离线
     *
     * @param user_id: 用户ID
     * @param callback: 回调
     */
    this.playerDisconnected = function(user_id, callback) {
        callback = callback || function() {};

        var player = this.getPlayer(user_id);

        if (! player && this.isSpectator(user_id)) {
            //  从旁观者队列删除
            this.removeFromSpectator(user_id);

            //  删除客户端连接
            this.removeConnection(user_id);

            // 通知给其他玩家
            this.pushMessage(CONST.PUSH.PLAYER_DISCONNECTED_PUSH, user_id);

            return callback(null);
        }

        if (! player) {
            return callback(null);
        }

        // 1. 从旁观者队列删除
        this.removeFromSpectator(user_id);

        // 2. 删除客户端连接
        this.removeConnection(user_id);

        // 3. 设置为离线
        player.is_online = false;

        // 4. 通知给其他玩家
        this.pushMessage(CONST.PUSH.PLAYER_DISCONNECTED_PUSH, player.id);

        // 5. 【比赛场】如果游戏已经开始, 则托管
        if (this.type === CONST.ROOM_TYPE.MATCH && this.game_status === CONST.GAME_STATUS.PLAYING) {
            this.game_module.doSetManage(this, player, true);
        }

        return callback(null);
    };

    /**
     * 玩家进行游戏操作
     *
     * @param {string} user_id: 用户id
     * @param {object} data: 消息内容
     * @return {boolean}
     */
    this.doAction = function (user_id, data) {
        var player = this.getPlayer(user_id);
        if (! player) {
            return false;
        }

        this.game_module.doAction(this, player, data);

        return true;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  玩家信息相关
    //
    //  isAllRobotPlayer:           所有玩家是否机器人
    //  getPublicPlayers:           获取所有玩家的公共信息(供给游戏房间)
    //  getPlayerData:              获取某一玩家的公共信息(供给游戏房间)
    //  getPlayer:                  获取玩家信息(在房间玩的)
    //  isVipPlayer:                是否会员
    //  isCreator:                  是否创建者
    //  isSpectator:                是否旁观者
    //  removeFromSpectator:        从旁观者队列删除
    //
    //  onPlayerInfoChanged:        玩家信息发生了变化（执行全局任务）
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 所有玩家是否机器人
     *
     */
    this.isAllRobotPlayer = function() {
        for (var i = 0; i < this.player_count; i++) {
            var player = this.players[i];
            if (! player.is_robot) {
                return false;
            }
        }

        return true;
    };

    /**
     * 获取玩家公共信息
     *
     * @return {Array}
     */
    this.getPublicPlayers = function () {
        var players = [];
        for (var i = 0; i < this.players.length; i++) {
            var player = this.players[i];
            if (player) {
                var player_info = this.getPlayerData(player);
                players.push(player_info);
            }
            else
                players.push(null);
        }

        return players;
    };

    /**
     * 获取玩家的公共信息
     *
     * @param player: 玩家信息
     * @returns {Object}
     */
    this.getPlayerData = function(player) {
        var base_info = UTIL.simple_clone(player.base_info);

        base_info.is_managed = player.is_managed;
        base_info.is_online = player.is_online;
        base_info.is_ready = player.is_ready;
        base_info.is_creator = this.isCreator(player.id);
        base_info.index = player.index;

        base_info.score = player.score;

        return base_info;
    };

    /**
     * 获取用户信息
     *
     * @param {String} user_id: 用户编号
     * @return {Object} 用户信息
     */
    this.getPlayer = function(user_id) {
        for (var i = 0; i < this.players.length; i++) {
            var player = this.players[i];
            if (player && player.id === user_id)
                return player;
        }

        return null;
    };

    /**
     * 是否创建者
     *
     * @param player_id
     * @returns {boolean}
     */
    this.isCreator = function(player_id) {
        return (this.creator === player_id);
    };

    /**
     * 是否旁观者
     *
     * @param user_id
     */
    this.isSpectator = function(user_id) {
        return (this.spectators.indexOf(user_id) === -1);
    };

    /**
     * 从旁观者队列删除
     *
     * @param user_id
     */
    this.removeFromSpectator = function(user_id) {
        var index = this.spectators.indexOf(user_id);

        if (index === -1) {
            return;
        }

        this.spectators.splice(index, 1);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  客户端连接相关
    //
    //  sendMsg:                向单个客户端推送消息
    //  pushMessage:            向房间里指定的客户端（除了except）推送消息
    //  getConnection:          获取用户的客户端连接
    //  setConnection:          设置用户的客户端连接
    //  removeConnection:       删除用户的客户端连接
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
        this.channel_service.pushMessageByUids(route, data, [connection], {}, function () {});
    };

    /**
     * 向房间里指定的客户端（除了except）推送消息
     *
     * @param {String} route: 推送路径
     * @param {Object} data: 发给用户端的信息
     * @param {String} [except]: 不发送给这个用户
     */
    this.pushMessage = function(route, data, except) {
        var connections = [];
        if (except) {
            var except_connection = this.getConnection(except);
            for (var i = 0; i < this.connections.length; i++) {
                var connection = this.connections[i];
                if (except_connection !== connection)
                    connections.push(connection);
            }
        } else {
            connections = this.connections;
        }

        if (connections.length === 0) {
            return;
        }

        if (data === undefined || data === null) {
            data = {};
        }

        //  发送消息
        this.channel_service.pushMessageByUids(route, data, connections, {}, function () {});
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

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  解散房间相关
    //
    //  dissolveRoom:           房主解散房间
    //  requestDissolve:        请求解散房间
    //  acceptDissolve:         用户同意解散
    //  rejectDissolve:         用户拒绝解散
    //
    //  kickPlayer:             踢出用户
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 房主解散房间
     *
     * @param user_id: 创建者ID，如果不指定，则认为是系统自动解散
     * @param is_auto_dissolve: 是否自动解散(创建N分钟还没开始游戏，自动解散)
     */
    this.dissolveRoom = function(user_id, is_auto_dissolve) {
        // 1. 如果游戏已开始, 不可以解散房间
        if (this.hasBegan()) {
            return;
        }

        // 2. 如果不是房主, 不能解散房间
        if (! this.isCreator(user_id)) {
            return;
        }

        // 3. 指定时间（例如15分钟）自动解散房间
        var timeout = 0;
        if (is_auto_dissolve) {
            timeout = IDLE_DISSOLVE_TIME;
        }

        // 4. 发送解散房间消息
        this.pushMessage(CONST.PUSH.ROOM_DISSOLVED_PUSH, {
            room_id: this.id,
            timeout: timeout
        });

        /*// 5. 向大厅推送解散消息
        if (this.type == CONST.ROOM_TYPE.PRIVATE) {
            // 私人房间
            if (is_auto_dissolve) {
                this.game_engine.notifyRoomDissolve(this.id, CONST.REASON.AUTO_DISSOLVED);
            } else {
                this.game_engine.notifyRoomDissolve(this.id, CONST.REASON.CREATOR_DISSOLVED);
            }
        }*/
        if (this.isClubRoom()) {
            // 俱乐部房间, 需要广播给所有成员
            Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                club_id: this.club_id,
                data: {
                    room_id: this.id,
                    reason: CONST.REASON.CLUB_ROOM_AUTO_DISSOLVED
                }
            });
        }

        // 6. 关闭房间
        this.finishGame(true);
    };

    /**
     * 请求解散房间
     *
     * @param user_id
     */
    this.requestDissolve = function(user_id) {
        if (this.dissolve_data) {
            return;
        }

        // 只有房间中的玩家才可以申请解散
        var player = this.getPlayer(user_id);
        if (player == null && ! this.isCreator(user_id)) {
            return;
        }

        var player_index = -1;
        if (player) {
            player_index = player.index;
        }

        this.dissolve_data = {
            remain_time: DISSOLVE_TIME,
            player_index: player_index,
            states: []
        };
        // 设置房间状态, 发起者默认同意
        for (var i = 0; i < this.max_player_count; i++) {
            this.dissolve_data.states[i] = false;
        }
        if (player) {
            this.dissolve_data.states[player_index] = true;
        }

        // 推送消息
        this.pushMessage(CONST.PUSH.DISSOLVE_REQUEST_PUSH, this.dissolve_data);
    };

    /**
     * 用户同意解散
     *
     * @param user_id: 用户ID
     */
    this.acceptDissolve = function(user_id) {
        if (! this.dissolve_data) {
            return;
        }

        var player = this.getPlayer(user_id);
        if (! player) {
            return;
        }

        // 玩家同意
        this.dissolve_data.states[player.index] = true;

        // 推送消息
        this.pushMessage(CONST.PUSH.DISSOLVE_REQUEST_PUSH, this.dissolve_data);

        // N-1玩家都同意, 解散房间
        var disagree_count = 0;
        for (var i = 0; i < this.dissolve_data.states.length; i++) {
            if (this.dissolve_data.states[i] === false) {
                disagree_count ++;
            }
        }

        if (disagree_count <= 1) {
            // 向游戏房间推送消息
            this.pushMessage(CONST.PUSH.DISSOLVE_SUCCESS_PUSH, {
                room_id: this.id
            });

            // 向大厅推送解散消息
            // this.game_engine.notifyRoomDissolve(this.id, CONST.REASON.PLAYER_DISSOLVED);

            if (this.isClubRoom()) {
                // 俱乐部房间, 需要广播给所有成员
                Event.emit(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, {
                    club_id: this.club_id,
                    data: {
                        room_id: this.id,
                        reason: CONST.REASON.CLUB_ROOM_MANUAL_DISSOLVED
                    }
                });
            }

            // 游戏结束
            this.game_module.doRoundOver(this, true);
        }
    };

    /**
     * 用户拒绝解散
     *
     * @param user_id: 用户ID
     */
    this.rejectDissolve = function(user_id) {
        if (! this.dissolve_data) {
            return;
        }

        var player = this.getPlayer(user_id);
        if (! player) {
            return;
        }

        this.dissolve_data = null;
        this.pushMessage(CONST.PUSH.DISSOLVE_REJECT_PUSH, {
            player_index: player.index
        });
    };

    /**
     * 向大厅推送房间解散信息
     *
     * @param room_id: 房间号
     * @param reason: 理由
     *
    this.notifyRoomDissolve = function(room_id, reason) {
        for (var i = 0; i < this.connections.length; i++) {
            var connection = this.connections[i];

            var user_id = connection.uid;

            // 要向大厅推送
            Event.emit(CONST.EVENT.ROOM_DISSOLVED, {
                user_id: user_id,
                data: {
                    room_id: room_id,
                    reason: reason
                }
            });
        }
    };*/

    ///////////////////////////////////////////////////////////////////////////
    //
    //  聊天相关
    //
    //  sendChat:           发送聊天消息
    //  sendQuickChat:      发送快速聊天消息
    //  sendVoiceMsg:       发送语音聊天信息
    //  sendEmoji:          发送表情
    //
    ///////////////////////////////////////////////////////////////////////////

    /**
     * 发送聊天消息
     *
     * @param user_id: 用户ID
     * @param msg: 消息
     *      content - 消息内容
     * @returns {boolean}
     */
    this.sendChat = function(user_id, msg) {
        var player = this.getPlayer(user_id);

        if (! player) {
            return false;
        }

        // 发送消息
        this.pushMessage(CONST.PUSH.ROOM_CHAT_PUSH, {
            content: msg.content,
            sender: player.id
        });
    };

    /**
     * 发送快速聊天消息
     *
     * @param user_id: 用户ID
     * @param msg: 消息
     *      content - 消息内容
     * @returns {boolean}
     */
    this.sendQuickChat = function(user_id, msg) {
        var player = this.getPlayer(user_id);

        if (! player) {
            return false;
        }

        // 发送消息
        this.pushMessage(CONST.PUSH.ROOM_QUICK_CHAT_PUSH, {
            content: msg.content,
            sender: player.id
        });
    };

    /**
     * 发送语音
     *
     * @param user_id: 用户ID
     * @param msg: 消息
     *      data - 语音内容
     * @returns {boolean}
     */
    this.sendVoiceMsg = function(user_id, msg) {
        var player = this.getPlayer(user_id);

        if (! player) {
            return false;
        }

        // 发送消息
        this.pushMessage(CONST.PUSH.VOICE_MSG_PUSH, {
            content: msg.data,
            sender: player.id
        });
    };

    /**
     * 发送表情
     *
     * @param user_id: 用户ID
     * @param msg: 消息
     *      emoji - 内容
     * @returns {boolean}
     */
    this.sendEmoji = function(user_id, msg) {
        var player = this.getPlayer(user_id);

        if (! player) {
            return false;
        }

        // 发送消息
        this.pushMessage(CONST.PUSH.ROOM_EMOJI_PUSH, {
            content: msg.emoji,
            sender: player.id
        });
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  游戏状态相关
    //
    //  hasBegan:           检查游戏是否开始
    //  finishGame:         结束游戏
    //  roundOver:          一回合结束了
    //
    //  syncGameData:       同步游戏
    //  isIdle:             房间创建->指定时间内还没开始(自动解散使用)
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 检查游戏是否开始
     *
     * @returns {boolean}
     */
    this.hasBegan = function() {
        return (this.round_no > 0) && (this.status !== CONST.ROOM_STATUS.WAITING);
    };

    /**
     * 结束游戏
     *
     */
    this.finishGame = function(force_exit) {
        if (this.status === CONST.ROOM_STATUS.FINISHED) {
            return;
        }

        // 设置房间状态, 游戏状态
        this.status = CONST.ROOM_STATUS.FINISHED;
        this.game_status = CONST.GAME_STATUS.FINISHED;

        // 在打一局时解散，不用保存房间
        if ((force_exit && this.round_no > 1) || (! force_exit && this.round_no >= 1)) {
            // 至少打过一局, 保存游戏记录
            this.saveModel();
        } else {
            // 游戏还没开始, 删除游戏房间
            RoomModel.delete(this.id, function() {});

            var room_fee;
            // 3. 如果房主支付, 退回房费
            if (this.isPrivateRoom()) {
                // 私人房间
                if (this.settings.fee_method === this.game_module.CONSTANT.FEE_METHOD.CREATOR) {
                    room_fee = this.needed_gems;
                    var creator_id = this.creator;

                    UserModel.lockAndGet(creator_id, function (err, user) {
                        if (err || !user) {
                            UserModel.unlock(creator_id);
                            return console.error(ERROR.MODEL_NOT_FOUND);
                        }

                        // 退回房费
                        UserModel.save({
                            id: user.id,
                            gems: user.gems + room_fee
                        }, function (err, result) {
                            UserModel.unlock(creator_id);

                            if (err || !result) {
                                return console.error(ERROR.INVALID_OPERATION);
                            }

                            // 要向创建者送
                            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                                user_id: creator_id,
                                data: {
                                    award: room_fee,
                                    gems: user.gems + room_fee,
                                    reason: CONST.REASON.ROLLBACK_CREATOR
                                }
                            });
                        });
                    });
                }
            } else if (this.isClubRoom()) {
                // 退回俱乐部房卡
                var room_id = this.id;
                var club_id = this.club_id;
                room_fee = this.needed_gems;
                var self = this;
                UserModel.lockAndGet(this.creator, function(err, club_creator) {
                    if (err || ! club_creator) {
                        UserModel.unlock(self.creator);
                        return console.error(ERROR.MODEL_NOT_FOUND);
                    }

                    // 退回房费
                    UserModel.save({
                        id: club_creator.id,
                        club_gems: club_creator.club_gems + room_fee
                    }, function(err, result) {
                        UserModel.unlock(self.creator);

                        if (err || ! result) {
                            return console.error(ERROR.INVALID_OPERATION);
                        }

                        // 要向俱乐部创建者推送
                        Event.emit(CONST.EVENT.CLUB_INFO_CHANGED_TO_CREATOR, {
                            user_id: club_creator.id,
                            data: {
                                club_id: club_id,
                                room_id: room_id,
                                award: room_fee,
                                club_gems: club_creator.club_gems + room_fee,
                                reason: CONST.REASON.ROLLBACK_CREATOR
                            }
                        });
                    });
                });
            }
        }

        // 清理玩家的房间信息
        for (var i = 0; i < this.players.length; i++) {
            var player = this.players[i];

            if (player) {
                UserModel.clearRoomID(player.id, false);
            }
        }
    };

    /**
     * 一回合结束了
     *
     */
    this.roundOver = function(callback) {
        var self = this;
        RoundModel.saveRound(self, function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (self.round_no === 1) {
                //  第一局要扣除钻石
                var saved_count = 0, wished_save_count = 0;
                var onSaveSuccess = function() {
                    saved_count ++;

                    if (saved_count >= wished_save_count) {
                        callback(null);
                    }
                };

                if (self.isPrivateRoom()) {
                    // 私人房间
                    var takeRoomFee = function(player, room_fee) {
                        UserModel.lockAndGet(player.id, function(err, user) {
                            if (err || ! user) {
                                UserModel.unlock(player.id);
                                console.error(ERROR.MODEL_NOT_FOUND);
                                return onSaveSuccess();
                            }

                            // 扣取房费
                            UserModel.save({
                                id: user.id,
                                gems: user.gems - room_fee
                            }, function (err, result) {
                                UserModel.unlock(player.id);

                                if (err || ! result) {
                                    console.error(ERROR.INVALID_OPERATION);
                                }

                                return onSaveSuccess();
                            });
                        });
                    };

                    if (self.game_module.isAAPayMethod(self.settings)) {
                        // 如果是AA支付
                        var fee = self.needed_gems / self.player_count;
                        wished_save_count = self.player_count;

                        for (var i = 0; i < self.player_count; i++) {
                            var player = self.players[i];

                            takeRoomFee(player, fee);
                        }
                    } else {
                        // 房主支付, 已经扣掉，故不需要再扣
                        onSaveSuccess();
                    }
                } else if (self.isClubRoom()) {
                    return callback(null);
                } else if (self.isMatchFieldRoom()) {
                    // 比赛场不用扣房卡
                    return callback(null);
                }
            } else {
                //  第二局开始, 不需要扣钻石
                return callback(null);
            }
        });
    };

    /**
     * 房间创建->指定时间内还没开始(自动解散使用)
     *
     */
    this.isIdle = function() {
        var now = Date.now();
        var create_time;

        try {
            var date = new Date(this.created_at);
            create_time = Math.round(date.getTime());
        } catch (e) {
            console.error('房间ID ', this.id, ' 的创建时间格式不对', this.created_at);

            return false;
        }

        if (now - create_time >= IDLE_DISSOLVE_TIME * 60 * 1000) {
            return true;
        } else {
            return false;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  其他
    //
    //  update: 更新间隔(ms单位)
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 更新房间
     *
     * @param dt: 更新间隔(ms单位)
     */
    this.update = function(dt) {
        if (this.status === CONST.ROOM_STATUS.FINISHED) {
            return;
        }

        // 如果时间到，解散房间
        if (this.dissolve_data) {
            this.dissolve_data.remain_time -= dt / 1000;
            if (this.dissolve_data.remain_time <= 0) {
                // 向房间推送消息
                this.pushMessage(CONST.PUSH.DISSOLVE_SUCCESS_PUSH, {});

                try {
                    this.game_module.doRoundOver(this, true);
                } catch (e) {
                }

                this.dissolve_data = null;
            }
        } else {
            this.game_module.update(this, dt);
        }
    };
};

module.exports = GameRoom;