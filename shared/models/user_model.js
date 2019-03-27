/**
 * Created by leo on 12/5/2017.
 *
 * 【用户】
 */
var Model = require('./model');
var NICKNAMES = require('../config/nicknames');
var AVATARS = require('../config/avatars');

function UserModel() {
    Model.call(this);

    this.model = 'users';
    this.private_fields = ['password'];

    // 会员（作弊）等级
    this.LEVEL = {
        VIP: 999,
        NORMAL: 0
    };

    // 是否代理
    this.DEALER = {
        YES: 1,
        NO: 0
    };

    // 用户平台
    this.PLATFORM = {
        WINDOWS: 'windows',
        IOS: 'ios',
        ANDROID: 'android'
    };

    // 代理默认密码
    this.DEFAULT_DEALER_PASSWORD = '123456';

    /**
     * 根据account获取用户信息
     *
     * @param account: 账号类型
     * @param callback: 回调
     */
    this.getByAccount = function(account, callback) {
        this.getByFields([['account', account]], function(err, result) {
            if (! err && result.length > 0) {
                callback(err, result[0]);
            } else {
                callback(err, null);
            }
        });
    };

    /**
     * 创建用户
     *
     * @param user
     * @param callback
     */
    this.createUser = function(user, callback) {
        // 产生随机的用户ID
        var id = UTIL.randomNumber(6);

        var self = this;
        this.getByID(id, function(err, db_user) {
            if (err) {
                return callback(err);
            }

            // 已经有ID, 重新生成
            if (db_user) {
                return self.createUser(user, callback);
            }

            // 创建新的账号
            user.id = id;
            self.create(user, callback);
        });
    };

    /**
     * 获取用户的基础信息(游戏房间内使用)
     *
     * @param user: 用户信息
     * @returns {Object} 用户信息
     */
    this.getBaseInfo = function(user) {
        var base_user = {};

        base_user.id = user.id;
        base_user.name = user.name;
        base_user.gender = user.gender;
        base_user.gems = user.gems;
        base_user.avatar = user.avatar;
        base_user.ip = user.ip;
        //base_user.phone = user.phone;
        //base_user.address = user.address;
        base_user.level = user.level;
        base_user.is_online = user.is_online;

        return base_user;
    };

    /**
     * 将所有玩家标记为下线，清空缓存
     *
     */
    this.offlineAllPlayers = function () {
        this.query('update ' + this.model + ' set is_online = 0, match_field_id = ""');
        this.clearCache();
    };

    /**
     * 清理用户的房间信息
     *
     * @param user_id
     * @param need_clean_match_field
     * @param callback
     */
    this.clearRoomID = function(user_id, need_clean_match_field, callback) {
        callback = callback || function() {};

        var self = this;
        this.lockAndGet(user_id, function(err, user) {
            if (err || ! user) {
                self.unlock(user_id);
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            user.room_id = '';
            if (need_clean_match_field) {
                user.match_field_id = '';
            }

            self.save(user, function() {
                self.unlock(user_id);
                callback(null);
            });
        });
    };

    /**
     * 查找空闲的机器人
     *
     * @param count
     * @param callback
     */
    this.getIdleRobots = function(count, callback) {
        this.getByFields([['is_robot', 1]], function(err, result) {
            if (err) {
                return callback(err);
            }

            if (result.length === 0) {
                return callback(new Error(ERROR.NO_IDLE_ROBOTS));
            }

            // 随机抽取count个机器人
            var robots = [];
            var dirty = {};
            for (var i = 0; i < count; i++) {
                do {
                    var index = UTIL.randomInt(0, result.length);
                } while (dirty[index]);

                dirty[index] = true;
                robots.push(result[index]);
            }

            return callback(null, robots);
        });
    };

    /**
     * 批量创建机器人
     *
     */
    this.createRobots = function() {
        var self = this;
        this.getCountEx([['is_robot', 1]], function(err, robot_count) {
            if (err) {
                return;
            }

            // 创建100个机器人
            var need_count = 100 - robot_count;
            for (var i = 0; i < need_count; i++) {
                self.createUser({
                    account: 'robot_' + (i + 1),
                    name: NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)],
                    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
                    gender: ['男', '女'][Math.floor((Math.random() * 100)) % 2],
                    gems: 0,
                    match_gems: 0,
                    is_robot: 1,
                    ip: UTIL.randomInt(50, 240) + '.' + UTIL.randomInt(1, 240) + '.' + UTIL.randomInt(1, 240) + '.' + UTIL.randomInt(1, 240),
                    created_at: UTIL.getTimeDesc()
                });
            }
        });
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  代理相关
    //
    //  getInfoWithChildCount:      获取用户信息(包含推荐用户数)
    //  getChildUserCount:          获取子用户数
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     *  获取用户信息(包含推荐用户数)
     *
     */
    this.getInfoWithChildCount = function(user_id, callback) {
        var self = this;
        this.getByID(user_id, function(err, user) {
            if (err || ! user) {
                return callback(true);
            }

            self.getChildUserCount(user_id, function(err, child_count) {
                if (err) {
                    return callback(true);
                }

                // 追加推荐人数, 不要密码
                user.child_count = child_count;
                user.password = null;

                return callback(null, user);
            });
        });
    };

    /**
     * 获取子用户数
     *
     */
    this.getChildUserCount = function(user_id, callback) {
        var conditions = [['r_code', user_id]];

        this.getCountEx(conditions, callback);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  统计相关
    //
    //  getTotalCount:              获取总用户数
    //  getTotalCountByPlatform:    获取总用户数（根据平台）
    //  getRegisteredCount:         指定日期注册用户数
    //  getActiveUserCount:         指定日期活跃用户数
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 获取总用户数
     *
     */
    this.getTotalCount = function(callback) {
        return this.getCount(callback);
    };

    /**
     * 获取总用户数（根据平台）
     *
     * @param platform
     * @param callback
     */
    this.getTotalCountByPlatform = function(platform, callback) {
        this.getCountEx([['platform', platform]], callback);
    };

    /**
     * 指定日期注册用户数
     *
     */
    this.getRegisteredCount = function(date, callback) {
        var conditions = [['created_at', 'like', date + '%']];

        this.getCountEx(conditions, callback);
    };

    /**
     * 指定日期活跃用户数
     *
     */
    this.getActiveUserCount = function(date, callback) {
        var conditions = [['last_login_time', 'like', date + '%']];

        this.getCountEx(conditions, callback);
    };
}

UserModel.prototype = new Model();
UserModel.prototype.constructor = UserModel;

global.UserModel = new UserModel();
module.exports = global.UserModel;


