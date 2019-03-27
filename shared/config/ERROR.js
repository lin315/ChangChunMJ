/**
 * Created by Administrator on 11/3/2017.
 */

module.exports = {
    // 用户验证相关
    FAIL_TO_AUTH: 100,
    USER_BLOCKED: 101,
    FAIL_LOGIN: 102,
    INVALID_USER: 103,
    INVALID_PASSWORD: 104,
    ACCOUNT_ALREADY_EXISTS: 105,
    NOT_ENOUGH_PRIVILEGE: 106,
    USER_WAITING_DEALER: 107,

    // 数据库相关
    MODEL_NOT_FOUND: 201,
    INVALID_OPERATION: 202,

    // 绑定推荐人
    BIND_DEALER_SELF: 300,
    BIND_DEALER_EXISTS: 301,
    BIND_DEALER_NOT_FOUND: 302,

    // 赠送钻石
    USER_NOT_DEALER: 310,
    USER_NOT_BIND_ME: 311,

    // 创建/加入/离开房间相关
    INVALID_CREATE_ROOM_SETTINGS: 400,
    NOT_ENOUGH_GEMS: 401,
    SIT_ALREADY_TAKEN: 402,
    ROOM_IS_FULL: 403,
    INVALID_SEAT_NO: 404,
    CAN_NOT_LEAVE_WHEN_PLAYING: 405,
    INVALID_JOIN_ROOM_SETTINGS: 406,
    INVALID_ROOM_ID: 407,
    ALREADY_IN_ROOM: 408,

    // 参数有效性
    INVALID_PARAMS: 500,
    UNSUPPORTED_FORMAT: 501,
    INVALID_PHONE: 502,
    SMS_CODE_EXPIRED: 503,
    INVALID_SMS_CODE: 504,

    // 俱乐部相关
    EXCEED_MAX_CREATE_CLUB_COUNT: 600,
    INVALID_CLUB_ID: 601,
    ALREADY_CLUB_MEMBER: 602,
    NOT_CLUB_CREATOR: 603,
    KICK_WHILE_PLAYING: 604,
    NOT_CLUB_MEMBER: 605,
    NOT_ENOUGH_CLUB_GEMS: 606,
    NOT_CLUB_ADMIN: 607,
    EXCEED_MAX_CLUB_ADMIN_COUNT: 608,

    // 比赛场
    ALREADY_SIGNED_TO_MATCH_FIELD: 700,
    NOT_ENOUGH_MATCH_GEMS: 701,
    INVALID_MATCH_FIELD_ID: 702,
    UNABLE_TO_QUIT_MATCH_WHILE_IN_ROOM: 703,
    NO_IDLE_ROBOTS: 704,
    NO_AVAILABLE_MATCH: 705,

    // 服务器内部相关
    SESSION_BIND_FAILED: 1001,
    FAIL_TO_CONNECT_HALL_SERVER: 1002,
    KICK_SESSION_FAILED: 1003,
    GAME_MODULE_NOT_FOUND: 1004,
    CONNECTOR_NOT_FOUND: 1005,
    FAIL_TO_CONNECT_GAME_SERVER: 1006
};