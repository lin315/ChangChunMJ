/**
 * Created by Administrator on 11/9/2017.
 */
module.exports = {
    // 彭泽杂胡
    //WX_APP_ID: 'wx6cb0fb1eab2b2cb0',
    //WX_APP_SECRET: '47a877dda0cff89f76ea8e29ef921aae',

    // 太行棋牌
    WX_APP_ID: 'wx70fd4e25da0f6e41',
    WX_APP_SECRET: 'ce9f19bc12f127af67d0e7b9ab8b5a31',

    BUNDLE_ID: 'com.yjdlsoft.changchunmj',

    // 模型名称
    MODEL: {
        ADMIN: 'admin',
        ADMIN_LOG: 'admin_log',
        DEALER_RATE: 'dealer_rate',
        DEALER_WITHDRAW: 'dealer_withdraw',
        DEALER_MESSAGE: 'dealer_message',
        FEEDBACK: 'feedback',
        GAME: 'game',
        GOOD: 'good',
        MESSAGE: 'message',
        ORDER: 'order',
        ORDER_LOG: 'order_log',
        ROOM: 'room',
        ROUND: 'round',
        SETTING: 'setting',
        SHARE: 'share',
        SMS: 'sms',
        STATISTIC: 'statistic',
        USER: 'user',
        CLUB: 'club',
        CLUB_MEMBER: 'club_member',
        CLUB_ROOM_SETTING: 'club_room_setting',
        CHECK_IN: 'check_in',
        DEALER_LOG: 'dealer_log',

        MATCH_FIELD: 'match_field',
        MATCH_ENTRY_FORM: 'match_entry_form',
        MATCH_WINNER: 'match_winner',

        CLIENT: 'client'
    },

    // 模块名称
    MODULE: {
        API: 'api',
        AUTH: 'auth',
        CACHE: 'cache',
        DATA: 'data',
        EVENT: 'event',
        LANG: 'lang',
        LOADER: 'loader',
        LOCK: 'lock',
        MYSQL: 'mysql',
        PAY: 'pay'
    },

    //  游戏ID
    GAME_ID: {
        YUNCHENG: 'yuncheng',
        TUIDAOHU: 'tuidaohu',
        QINSHUI: 'qinshui',
        DOUDIZHU: 'doudizhu'
    },

    // 房间状态
    ROOM_STATUS: {
        WAITING: 'waiting',
        PLAYING: 'playing',
        FINISHED: 'finished'
    },

    // 游戏状态
    GAME_STATUS: {
        WAITING: 'waiting',
        STARTED: 'started',
        ZHUAPAI: 'zhuapai',
        JIAOPAI: 'jiaopai',
        READY_TO_PLAY: 'ready_to_play',
        PLAYING: 'playing',
        FINISHED: 'finished',

        JIAO_JIN: 'jiao_jin',
        JIAO_BAO: 'jiao_bao'
    },

    // 房间类型
    ROOM_TYPE: {
        PRIVATE: 'private',
        CLUB: 'club',
        MATCH: 'match'
    },

    // 比赛场状态
    MATCH_FIELD_STATUS: {
        WAITING: 'waiting',
        PLAYING: 'playing',
        FINISHED: 'finished'
    },

    // 比赛场类型
    MATCH_TYPE: {
        DAY: 'day',
        WEEK: 'week'
    },

    // 广播通道
    CHANNEL: {
        ALL_USERS: 'all_users',
        CLUB: 'club_'
    },

    //  事件定义
    EVENT: {
        USER_INFO_CHANGED: 'user_info_changed',                                                                         //  用户信息发生了变化, 由大厅服务器来处理, 并推送给用户
        PLAYER_INFO_CHANGED: 'player_info_changed',                                                                     //  玩家信息发生了变化, 需要由游戏服务器处理
        //ROOM_DISSOLVED: 'room_dissolved',                                                                             //  房间被解散了
        //KNOWN_ROOMS: 'known_rooms',                                                                                   //  用户知道的房间列表
        //KNOWN_ROOM: 'known_room',                                                                                     //  用户知道的房间

        //  俱乐部相关
        CLUB_INFO_CHANGED_TO_CREATOR: 'club_info_changed_to_creator',                                                   //  俱乐部信息发生了变化(通知给俱乐部创建者)
        CLUB_INFO_CHANGED_TO_MEMBER: 'club_info_changed_to_member',                                                     //  俱乐部信息发生了变化(通知给俱乐部成员)
        CLUB_ROOMS_TO_MEMBERS: 'club_rooms_to_members',                                                                 //  获取指定俱乐部的所有房间列表(通知给所有俱乐部成员)
        CLUB_ROOM_SETTING_CREATED_TO_MEMBERS: 'club_room_setting_created_to_members',                                   //  新建了俱乐部房间选项(通知给所有俱乐部成员)
        CLUB_ROOM_SETTING_DELETED_TO_MEMBERS: 'club_room_setting_deleted_to_members',                                   //  俱乐部房间选项被删除(通知给所有俱乐部成员)
        CLUB_ROOM_INFO_CHANGED_TO_MEMBERS: 'club_room_info_changed_to_members',                                         //  俱乐部房间信息发生了变化(通知给所有俱乐部成员)
        CLUB_MEMBER_ADDED: 'club_member_added',                                                                         //  新增俱乐部成员(在大厅推送通道添加)
        CLUB_MEMBER_DELETED: 'club_member_deleted',                                                                     //  删除俱乐部成员(从大厅推送通道删除)
        CLUB_CREATOR_CHANGED_TO_CREATOR: 'club_creator_changed_to_creator',                                             //  俱乐部创建者变了
        CLUB_ADMIN_CHANGED_TO_MEMBER: 'club_admin_changed_to_member',                                                   //  授予/取消俱乐部管理员

        // 比赛场相关
        MATCH_ROOM_CREATED: 'match_room_created',                                                                       //  比赛场房间创建好了
    },

    //  理由(与EVENT事件对应)
    REASON: {
        //  用户信息变化
        USER_BIND_ME: 'user_bind_me',                                                                                   //  用户绑定推荐码（给代理看）
        ROLLBACK_CREATOR: 'rollback_creator',                                                                           //  解散房间退回房卡给创建者
        ADMIN_SEND_GEMS: 'admin_send_gems',                                                                             //  管理员赠送房卡
        ADMIN_MINUS_GEMS: 'admin_minus_gems',                                                                           //  管理员扣除房卡
        ADMIN_SEND_CLUB_GEMS: 'admin_send_club_gems',                                                                   //  管理员赠送俱乐部房卡
        ADMIN_MINUS_CLUB_GEMS: 'admin_minus_club_gems',                                                                 //  管理员扣除俱乐部房卡
        ADMIN_SEND_MATCH_GEMS: 'admin_send_match_gems',                                                                 //  管理员赠送比赛卡
        ADMIN_MINUS_MATCH_GEMS: 'admin_minus_match_gems',                                                               //  管理员扣除比赛卡
        ADMIN_BLOCK_USER: 'admin_block_user',                                                                           //  管理员查封账号
        ADMIN_UNBLOCK_USER: 'admin_unblock_user',                                                                       //  管理员解封账号
        ADMIN_SET_USER_DEALER: 'admin_set_user_dealer',                                                                 //  管理员设置为代理
        ADMIN_UNSET_USER_DEALER: 'admin_unset_user_dealer',                                                             //  管理员取消代理
        ADMIN_SET_USER_VIP: 'admin_set_user_vip',                                                                       //  管理员设置为会员
        ADMIN_UNSET_USER_VIP: 'admin_unset_user_vip',                                                                   //  管理员取消会员
        USER_BUY_GEMS: 'user_buy_gems',                                                                                 //  用户购买房卡
        USER_CHARGE_CLUB_GEMS: 'user_charge_club_gems',                                                                 //  用户充俱乐部房卡
        DEALER_SEND_GEMS: 'dealer_send_gems',                                                                           //  代理赠送房卡
        DEALER_SEND_CLUB_GEMS: 'dealer_send_club_gems',                                                                 //  代理赠送俱乐部房卡
        MATCH_CANCELLED_ALREADY_IN_OTHER_ROOM: 'match_cancelled_already_in_other_room',                                 //  比赛资格被取消(已经在其他房间玩)
        SIGN_TO_MATCH_FIELD: 'sign_to_match_field',                                                                     //  扣取比赛场入场费
        ROLLBACK_MATCH_FIELD_FEE: 'rollback_match_field_fee',                                                           //  退回比赛场入场费

        //  解散房间相关
        AUTO_DISSOLVED: 'auto_dissolved',                                                                               //  超时自动解散
        CREATOR_DISSOLVED: 'creator_dissolved',                                                                         //  房主解散
        CLUB_CREATOR_REMOVED: 'club_creator_removed',                                                                   //  俱乐部群主删除
        PLAYER_DISSOLVED: 'player_dissolved',                                                                           //  协商解散
        FINISH_DISSOLVED: 'finish_dissolved',                                                                           //  游戏完毕解散

        // 俱乐部相关
        CREATE_CLUB_MINUS_GEMS: 'create_club_minus_gems',                                                               //  创建俱乐部扣除房卡
        CLUB_CREATOR_UPDATED_INFO: 'club_creator_updated_info',                                                         //  俱乐部创建者更新了俱乐部信息(名称，联系方式，公告)

        CLUB_MEMBER_INVITED: 'club_member_invited',                                                                     //  被邀请加入俱乐部
        CLUB_MEMBER_FIRED: 'club_member_fired',                                                                         //  从俱乐部开除

        CLUB_ROOM_CREATED: 'club_room_created',                                                                         //  新建了俱乐部房间
        CLUB_ROOM_DELETED: 'club_room_deleted',                                                                         //  俱乐部房间被删除
        CLUB_MEMBER_SIT_ROOM: 'club_member_sit_room',                                                                   //  玩家进入房间
        CLUB_MEMBER_LEFT_ROOM: 'club_member_left_room',                                                                 //  玩家离开房间
        CLUB_MEMBER_DISCONNECTED: 'club_member_disconnected',                                                           //  玩家断线
        CLUB_ROOM_GAME_STARTED: 'club_room_game_started',                                                               //  俱乐部房间内游戏开始
        CLUB_MEMBER_KICKED: 'club_member_kicked',                                                                       //  俱乐部成员被踢走
        CLUB_ROOM_MANUAL_DISSOLVED: 'club_room_manual_dissolved',                                                       //  俱乐部房间协商解散
        CLUB_ROOM_AUTO_DISSOLVED: 'club_room_auto_dissolved',                                                           //  俱乐部房间自动解散

        CLUB_CREATOR_TRANSFERED: 'club_creator_transfered',                                                             //  俱乐部创建者转让(给老创始人)
        CLUB_CREATOR_AWARDED: 'club_creator_awarded',                                                                   //  俱乐部创建者被转让(给新创始人)
        CLUB_ADMIN_AWARDED: 'club_admin_awarded',                                                                       //  授予俱乐部管理员
        CLUB_ADMIN_REVOKED: 'club_admin_revoked'                                                                        //  驳回俱乐部管理员
    },

    //  推送
    PUSH: {
        // 大厅推送
        USER_INFO_CHANGED_PUSH: 'user_info_changed_push',                                                               //  玩家信息变了

        // 房间推送
        PLAYER_ENTER_PUSH: 'player_enter_push',                                                                         //  玩家进入房间
        PLAYER_SIT_PUSH: 'player_sit_push',                                                                             //  玩家坐下位置
        PLAYER_DISCONNECTED_PUSH: 'player_disconnected_push',                                                           //  玩家离线
        PLAYER_LEAVE_PUSH: 'player_leave_push',                                                                         //  玩家离开
        PLAYER_ACTION_PUSH: 'player_action_push',                                                                       //  玩家操作

        PLAYER_INFO_CHANGED_PUSH: 'player_info_changed_push',                                                           //  玩家信息发生了变化(全局事件)

        DISSOLVE_REQUEST_PUSH: 'dissolve_request_push',                                                                 //  申请解散房间
        DISSOLVE_REJECT_PUSH: 'dissolve_reject_push',                                                                   //  拒绝解散房间
        DISSOLVE_SUCCESS_PUSH: 'dissolve_success_push',                                                                 //  房间解散成功(协商)
        ROOM_DISSOLVED_PUSH: 'room_dissolved_push',                                                                     //  房间解散成功(房主)

        // 俱乐部相关
        CLUB_INFO_CHANGED_TO_CREATOR_PUSH: 'club_info_changed_to_creator_push',                                         //  俱乐部信息发生了变化(通知给俱乐部创建者)
        CLUB_INFO_CHANGED_TO_MEMBER_PUSH: 'club_info_changed_to_member_push',                                           //  俱乐部信息发生了变化(通知给俱乐部成员)
        CLUB_ROOMS_TO_MEMBERS_PUSH: 'club_rooms_to_members_push',                                                       //  获取指定俱乐部的所有房间列表(通知给所有俱乐部成员)
        CLUB_ROOM_SETTING_CREATED_TO_MEMBERS_PUSH: 'club_room_setting_created_to_members_push',                         //  新建了俱乐部房间选项(通知给所有俱乐部成员)
        CLUB_ROOM_SETTING_DELETED_TO_MEMBERS_PUSH: 'club_room_setting_deleted_to_members_push',                         //  俱乐部房间选项被删除(通知给所有俱乐部成员)
        CLUB_ROOM_INFO_CHANGED_TO_MEMBERS_PUSH: 'club_room_info_changed_to_members_push',                               //  俱乐部房间信息发生了变化(通知给所有俱乐部成员)
        CLUB_CREATOR_CHANGED_TO_CREATOR_PUSH: 'club_creator_changed_to_creator_push',                                   //  俱乐部创建者转让(通知给两个俱乐部创建者)
        CLUB_ADMIN_CHANGED_TO_MEMBER_PUSH: 'club_admin_changed_to_member_push',                                         //  授予/取消俱乐部管理员

        // 比赛场相关
        MATCH_ROOM_CREATED_PUSH: "match_room_created_push",                                                             //  比赛场房间创建好了
        MATCH_FIELD_PLAYER_STATUS_PUSH: 'match_field_player_status_push',                                               //  比赛场玩家状态

        ROOM_QUICK_CHAT_PUSH: 'room_quick_chat_push',                                                                   //  快捷聊天短语
        ROOM_CHAT_PUSH: 'room_chat_push',                                                                               //  自由文字聊天(暂时不用)
        VOICE_MSG_PUSH: 'voice_msg_push',                                                                               //  语音聊天
        ROOM_EMOJI_PUSH: 'room_emoji_push',                                                                             //  表情聊天

        GAME_SYNC_PUSH: 'game_sync_push',                                                                               //  游戏同步
        GAME_START_PUSH: 'game_start_push',                                                                             //  游戏（第一回合）开始
        ROUND_START_PUSH: 'round_start_push',                                                                           //  牌局（回合）开始
        GAME_BUTTON_PUSH: 'game_button_push',                                                                           //  庄家推送
        CHOOSE_JIN_PUSH: 'choose_jin_push',                                                                             //  叫金(运城贴金, 沁水甩金)

        CHOOSE_BAO_PUSH: 'choose_bao_push',                                                                             //  叫宝牌

        GAME_PLAY_PUSH: 'game_play_push',                                                                               //  游戏正式开始(玩家可以操作了)
        ROUND_OVER_PUSH: 'round_over_push',                                                                             //  牌局（回合）结束
        NEXT_BUTTON_PUSH: 'next_button_push',                                                                           //  下回合庄家
        GAME_FINISHED_PUSH: 'game_finished_push',                                                                       //  游戏结束

        // 麻将推送
        MAHJONG_COUNT_PUSH: 'mahjong_count_push',                                                                       //  剩余麻将牌数
        PLAYER_HOLDS_PUSH: 'player_holds_push',                                                                         //  玩家手牌
        SPECTATOR_HOLDS_PUSH: 'spectator_holds_push',                                                                   //  旁观者手牌
        PLAYER_TING_MAP_PUSH: 'player_ting_map_push',                                                                   //  玩家可以听的牌
        PLAYER_BAO_TING_MAPS_PUSH: 'player_bao_ting_maps_push',                                                         //  玩家可以报听的情况
        PLAYER_TURN_PUSH: 'player_turn_push',                                                                           //  轮到玩家操作
        PLAYER_CHOICE_PUSH: 'player_choice_push',                                                                       //  玩家可选择的操作（胡杠碰）
        PLAYER_GUO_RESULT_PUSH: 'player_guo_result_push',                                                               //  玩家选择过（给自己看）
        VIP_VIEW_PAI_PUSH: 'vip_view_pai_push',                                                                         //  会员看牌
        VIP_BOOK_NEXT_PAI_PUSH: 'vip_book_next_pai_push',                                                               //  会员约牌
        VIP_REMOVE_MOPAI_PUSH: 'vip_remove_mopai_push',                                                                 //  通知会员被摸走的牌
        PLAYER_BONUS_PUSH: 'player_bonus_push',                                                                         //  玩家奖码
        PLAYER_MANAGED_PUSH: 'player_managed_push',                                                                     //  玩家托管状态变了
        PLAYER_SHIQIANG_PUSH: 'player_shiqiang_push',                                                                   //  玩家拾抢状态变了

        // 扑克推送
        PLAYER_POKER_COUNT_PUSH: 'player_poker_count_push',                                                             //  玩家手牌数量
        DEAL_POKER_STARTED: 'deal_poker_started',                                                                       //  开始发手牌
        DEAL_POKER_FINISHED: 'deal_poker_finished',                                                                     //  手牌抓完了
        START_JIAO_PAI_PUSH: 'start_jiao_pai_push',                                                                     //  开始玩家叫牌
        CHOOSE_LANDLORD_PUSH: 'choose_landlord_push',                                                                   //  叫完地主
        CHOOSE_LAIZI_PUSH: 'choose_laizi_push',                                                                         //  抽赖子
        BOTTOM_POKERS_PUSH: 'bottom_pokers_push',                                                                       //  显示底牌
        CANDIDATE_POKERS_PUSH: 'candidate_pokers_push',                                                                 //  玩家可出的牌组
        SPRING_PUSH: 'spring_push',                                                                                     //  春天
        SHOW_LAST_HOLDS_PUSH: 'show_last_holds_push'                                                                    //  回合结束亮牌
    },

    //  权限
    PRIVILEGE: {
        NONE: 'none',
        READ: 'read',
        WRITE: 'write'
    },

    //  支付通道
    PAY_CHANNEL: {
        WECHAT_PAY: 'wechat_pay',
        IAP: 'iap'
    }
};