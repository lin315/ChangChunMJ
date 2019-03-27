/**
 * Created by leo on 11/9/2017.
 */

var Event = module_manager.getModule(CONST.MODULE.EVENT);

var Job = require('./jobs');

var HallEngine = function() {
    this.app = null;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  推送相关
    //
    //  sendMessage:                                    给用户发送消息
    //  sendMessagesToClubMembers:                      给指定俱乐部的所有成员发送消息
    //
    //  onUserInfoChanged:                              用户信息发生了变化
    //
    //  onClubRoomSettingCreatedToMembers:              新建了俱乐部房间选项(通知给俱乐部所有成员)
    //  onClubRoomSettingDeletedToMembers:              俱乐部房间选项被删除(通知给俱乐部所有成员)
    //
    //  onClubInfoChangedToCreator:                     俱乐部信息变了(通知给俱乐部创建者)
    //  onClubInfoChangedToMember:                      俱乐部信息变了(通知给俱乐部成员)
    //
    //  onClubRoomsToMember:                            获取指定俱乐部的所有房间列表(通知给俱乐部所有成员)
    //
    //  onClubRoomInfoChangedToMembers:                 俱乐部房间信息发生了变化(新建房间, 离开房间, 进入房间, 游戏开始, 踢出玩家)
    //
    //  onClubMemberAdded:                              添加一个俱乐部成员
    //  onClubMemberDeleted:                            删除一个俱乐部成员
    //
    //  onClubCreatorChangedToCreator:                  转让俱乐部创始人
    //
    //  onClubMemberSetToAdmin:                         设为俱乐部管理员
    //  onClubMemberUnsetFromAdmin:                     从俱乐部管理员取消
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 给用户发送消息
     *
     * @param {string} user_id 用户ID
     * @param {string} route 路由
     * @param {object} data 信息
     */
    this.sendMessage = function(user_id, route, data) {
        var channel_service = this.app.get('channelService');
        var channel = channel_service.getChannel(CONST.CHANNEL.ALL_USERS, true);
        var connection;

        connection = channel.getMember(user_id);
        if (connection) {
            channel_service.pushMessageByUids(route, data, [connection], {}, function () {});
        }
    };

    /**
     * 给指定俱乐部的所有成员发送消息
     *
     * @param club_id
     * @param route
     * @param data
     */
    this.sendMessagesToClubMembers = function(club_id, route, data) {
        var channel_service = this.app.get('channelService');
        var channel = channel_service.getChannel(CONST.CHANNEL.CLUB + club_id, true);

        channel.pushMessage(route, data, {}, function () {});
    };

    /**
     * 用户信息发生了变化
     *
     * @param {Object} params 用户信息, 格式{ user_id, data: {} }
     */
    this.onUserInfoChanged = function(params) {
        this.sendMessage(params.user_id, CONST.PUSH.USER_INFO_CHANGED_PUSH, params.data);
    };

    /**
     * 新建了俱乐部房间选项(通知给俱乐部所有成员)
     *
     * @param params
     */
    this.onClubRoomSettingCreatedToMembers = function(params) {
        var club_id = params.club_id;

        this.sendMessagesToClubMembers(club_id,  CONST.PUSH.CLUB_ROOM_SETTING_CREATED_TO_MEMBERS_PUSH, params.data);
    };

    /**
     * 俱乐部房间选项被删除(通知给俱乐部所有成员)
     *
     * @param params
     */
    this.onClubRoomSettingDeletedToMembers = function(params) {
        var club_id = params.club_id;

        this.sendMessagesToClubMembers(club_id,  CONST.PUSH.CLUB_ROOM_SETTING_DELETED_TO_MEMBERS_PUSH, params.data);
    };

    /**
     * 俱乐部信息变了(通知给俱乐部创建者)
     *
     * @param params
     */
    this.onClubInfoChangedToCreator = function(params) {
        this.sendMessage(params.user_id, CONST.PUSH.CLUB_INFO_CHANGED_TO_CREATOR_PUSH, params.data);
    };

    /**
     * 俱乐部信息变了(通知给俱乐部成员)
     *
     * @param params
     */
    this.onClubInfoChangedToMember = function(params) {
        this.sendMessage(params.user_id, CONST.PUSH.CLUB_INFO_CHANGED_TO_MEMBER_PUSH, params.data);
    };

    /**
     * 获取指定俱乐部的所有房间列表(通知给俱乐部所有成员)
     *
     * @param params
     *      club_id 俱乐部ID
     *      data    房间信息列表
     */
    this.onClubRoomsToMember = function(params) {
        var club_id = params.club_id;
        var rooms = params.data;

        this.sendMessagesToClubMembers(club_id,  CONST.PUSH.CLUB_ROOMS_TO_MEMBERS_PUSH, rooms);
    };

    /**
     * 俱乐部房间信息发生了变化
     *  - 新建房间
     *  - 离开房间
     *  - 进入房间
     *  - 游戏开始
     *  - 踢出玩家
     *
     * @param params
     */
    this.onClubRoomInfoChangedToMembers = function(params) {
        var club_id = params.club_id;

        this.sendMessagesToClubMembers(club_id,  CONST.PUSH.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS_PUSH, params.data);
    };

    /**
     * 添加一个俱乐部成员
     *
     * @param params
     */
    this.onClubMemberAdded = function(params) {
        var user_id = params.user_id;
        var club_id = params.club_id;

        var channel_service = this.app.get('channelService');
        var channel = channel_service.getChannel(CONST.CHANNEL.ALL_USERS, true);
        var connection = channel.getMember(user_id);

        if (connection) {
            var club_channel = channel_service.getChannel(CONST.CHANNEL.CLUB + club_id, true);
            var record = club_channel.getMember(user_id);
            if (record) {
                // 已经有通道, 不用再添加
            } else {
                // 添加到通道
                console.log('添加用户', user_id, '俱乐部', club_id, connection.sid);
                club_channel.add(user_id, connection.sid);
            }
        }
    };

    /**
     * 删除一个俱乐部成员
     *
     * @param params
     */
    this.onClubMemberDeleted = function(params) {
        var user_id = params.user_id;
        var club_id = params.club_id;

        var channel_service = this.app.get('channelService');
        var club_channel = channel_service.getChannel(CONST.CHANNEL.CLUB + club_id, true);
        var record = club_channel.getMember(user_id);

        if (record) {
            club_channel.leave(user_id, record.sid);
        }
    };

    /**
     * 转让俱乐部创始人
     *
     * @param params
     */
    this.onClubCreatorChangedToCreator = function(params) {
        this.sendMessage(params.user_id, CONST.PUSH.CLUB_CREATOR_CHANGED_TO_CREATOR_PUSH, params.data);
    };

    /**
     * 授予/取消俱乐部管理员
     *
     * @param params
     */
    this.onClubAdminChangedToMember = function(params) {
        this.sendMessage(params.user_id, CONST.PUSH.CLUB_ADMIN_CHANGED_TO_MEMBER_PUSH, params.data);
    };

    /**
     * 比赛场房间建好了
     *
     * @param params
     */
    this.onMatchRoomCreated = function(params) {
        this.sendMessage(params.user_id, CONST.PUSH.MATCH_ROOM_CREATED_PUSH, params.data);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  其他
    //
    //  getGameServer:  获取适合的服务器, 暂时采用随机路由
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 获取适合的服务器, 暂时采用随机路由
     *
     * @return {Object} 服务器信息
     */
    this.getGameServer = function() {
        var gameServers = this.app.getServersByType('game');

        var len = gameServers.length;
        if (len === 0) {
            return null;
        }

        var index = UTIL.randomInt(0, len);

        return gameServers[index];
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  初始化
    //
    //  init:   初始化
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 初始化
     *
     * @param main_app
     */
    this.init = function(main_app) {
        this.app = main_app;

        Job.init(this.app);

        //  将所有玩家标记为下线, 并清空缓存
        UserModel.offlineAllPlayers();

        // 批量创建机器人
        //UserModel.createRobots();

        // 注册事件监听器
        Event.on(CONST.EVENT.USER_INFO_CHANGED, this.onUserInfoChanged.bind(this));

        // 俱乐部相关
        Event.on(CONST.EVENT.CLUB_ROOM_SETTING_CREATED_TO_MEMBERS, this.onClubRoomSettingCreatedToMembers.bind(this));
        Event.on(CONST.EVENT.CLUB_ROOM_SETTING_DELETED_TO_MEMBERS, this.onClubRoomSettingDeletedToMembers.bind(this));
        Event.on(CONST.EVENT.CLUB_INFO_CHANGED_TO_CREATOR, this.onClubInfoChangedToCreator.bind(this));
        Event.on(CONST.EVENT.CLUB_INFO_CHANGED_TO_MEMBER, this.onClubInfoChangedToMember.bind(this));
        Event.on(CONST.EVENT.CLUB_ROOMS_TO_MEMBERS, this.onClubRoomsToMember.bind(this));
        Event.on(CONST.EVENT.CLUB_ROOM_INFO_CHANGED_TO_MEMBERS, this.onClubRoomInfoChangedToMembers.bind(this));
        Event.on(CONST.EVENT.CLUB_MEMBER_ADDED, this.onClubMemberAdded.bind(this));
        Event.on(CONST.EVENT.CLUB_MEMBER_DELETED, this.onClubMemberDeleted.bind(this));
        Event.on(CONST.EVENT.CLUB_CREATOR_CHANGED_TO_CREATOR, this.onClubCreatorChangedToCreator.bind(this));
        Event.on(CONST.EVENT.CLUB_ADMIN_CHANGED_TO_MEMBER, this.onClubAdminChangedToMember.bind(this));

        // 比赛场相关
        Event.on(CONST.EVENT.MATCH_ROOM_CREATED, this.onMatchRoomCreated.bind(this));
    };
};

module.exports = new HallEngine();