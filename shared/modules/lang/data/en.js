/**
 * Created by leo on 11/24/2017.
 */
var ERROR = require('../../../config/ERROR');

var langs = {};

// 用户验证相关
langs[ERROR.FAIL_TO_AUTH] = '凭证无效';
langs[ERROR.USER_BLOCKED] = '账号被查封\n请加微信qsqp123456客服联系';
langs[ERROR.FAIL_LOGIN] = '登录失败';
langs[ERROR.INVALID_USER] = '无效用户';
langs[ERROR.INVALID_PASSWORD] = '密码有误';
langs[ERROR.ACCOUNT_ALREADY_EXISTS] = '账号已存在';
langs[ERROR.NOT_ENOUGH_PRIVILEGE] = '权限不够';
langs[ERROR.USER_WAITING_DEALER] = '请等待审核结果';

// 数据库相关
langs[ERROR.MODEL_NOT_FOUND] = '找不到数据库模型';
langs[ERROR.INVALID_OPERATION] = '数据库操作失败';

// 绑定推荐人
langs[ERROR.BIND_DEALER_SELF] = '不能绑定自己';
langs[ERROR.BIND_DEALER_EXISTS] = '已绑定推荐人';
langs[ERROR.BIND_DEALER_NOT_FOUND] = '推荐码无效';

// 赠送钻石
langs[ERROR.USER_NOT_DEALER] = '您不是代理';
langs[ERROR.USER_NOT_BIND_ME] = '该玩家没有绑定您';

// 创建/加入/离开房间相关
langs[ERROR.INVALID_CREATE_ROOM_SETTINGS] = '房间创建选项无效';
langs[ERROR.NOT_ENOUGH_GEMS] = '房卡不够';
langs[ERROR.SIT_ALREADY_TAKEN] = '该位置已经有玩家';
langs[ERROR.ROOM_IS_FULL] = '房间已满';
langs[ERROR.INVALID_SEAT_NO] = '无效位置';
langs[ERROR.CAN_NOT_LEAVE_WHEN_PLAYING] = '游戏状态下不能离开';
langs[ERROR.INVALID_JOIN_ROOM_SETTINGS] = '加入房间选项无效';
langs[ERROR.INVALID_ROOM_ID] = '房间号无效';
langs[ERROR.ALREADY_IN_ROOM] = '已经在房间玩';

// 参数有效性
langs[ERROR.INVALID_PARAMS] = '参数无效';
langs[ERROR.UNSUPPORTED_FORMAT] = '不支持类型';
langs[ERROR.INVALID_PHONE] = '无效手机号';
langs[ERROR.SMS_CODE_EXPIRED] = '验证码已过期';
langs[ERROR.INVALID_SMS_CODE] = '无效验证码';

// 俱乐部相关
langs[ERROR.EXCEED_MAX_CREATE_CLUB_COUNT] = '创建亲友圈数量达到上限';
langs[ERROR.INVALID_CLUB_ID] = '无效亲友圈ID';
langs[ERROR.ALREADY_CLUB_MEMBER] = '已经是该亲友圈成员了';
langs[ERROR.NOT_CLUB_CREATOR] = '不是亲友圈创建者';
langs[ERROR.KICK_WHILE_PLAYING] = '游戏已经开始不能踢出';
langs[ERROR.NOT_CLUB_MEMBER] = '不是该亲友圈的成员';
langs[ERROR.NOT_ENOUGH_CLUB_GEMS] = '亲友圈房卡不够';
langs[ERROR.NOT_CLUB_ADMIN] = '不是亲友圈管理员';
langs[ERROR.EXCEED_MAX_CLUB_ADMIN_COUNT] = '亲友圈管理员数量达到上限';

// 比赛场
langs[ERROR.ALREADY_SIGNED_TO_MATCH_FIELD] = '已经报了名';
langs[ERROR.NOT_ENOUGH_MATCH_GEMS] = '比赛卡不够';
langs[ERROR.INVALID_MATCH_FIELD_ID] = '无效比赛场';
langs[ERROR.UNABLE_TO_QUIT_MATCH_WHILE_IN_ROOM] = '游戏中的用户不能退出比赛';
langs[ERROR.NO_IDLE_ROBOTS] = '没有可用的机器人';
langs[ERROR.NO_AVAILABLE_MATCH] = '今天比赛已经打完';

// 服务器内部相关
langs[ERROR.SESSION_BIND_FAILED] = '绑定用户会话失败';
langs[ERROR.FAIL_TO_CONNECT_HALL_SERVER] = '连接大厅服务器失败';
langs[ERROR.KICK_SESSION_FAILED] = '踢出旧会话失败';
langs[ERROR.GAME_MODULE_NOT_FOUND] = '找不到游戏模块';
langs[ERROR.CONNECTOR_NOT_FOUND] = '找不到连接器';
langs[ERROR.FAIL_TO_CONNECT_GAME_SERVER] = '连接游戏服务器失败';

module.exports = langs;