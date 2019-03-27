/**
 * Created by leo on 12/3/2017.
 */

var AuthModule = function() {
    this.app = null;
    this.config = null;
    this.cache = null;

    /**
     * 授权用户
     *
     * @param {Model} auth_model 授权模型
     * @param {String|number} auth_id 用户ID
     * @param {Function} callback 回调
     */
    this.authorize = function (auth_model, auth_id, callback) {
        var user_token_key = 'user_token:' + auth_model.model + ':' + auth_id;

        //  重新获取安全的用户信息
        var self = this;
        this.cache.get(user_token_key, function (err, old_token) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            var token = UTIL.generateToken(auth_id);

            //  删除原来的登录信息
            if (old_token) {
                var old_token_key = 'token_user:' + auth_model.model + ':' + old_token;
                self.cache.del(old_token_key);
            }

            //  保存新的token
            var new_token_key = 'token_user:' + auth_model.model + ':' + token;
            self.cache.set(new_token_key, auth_id);
            self.cache.set(user_token_key, token);

            callback(null, token);
        });
    };

    /**
     * 对登录用户进行认证
     *
     * @param {Model} auth_model 验证模型
     * @param {String|number} auth_id 用户ID
     * @param {String} auth_token 验证凭证
     * @param {String} privilege_key 所需权限名称
     * @param {String} privilege_need 所需权限级别
     * @param {Function} callback 回调
     */
    this.authenticate = function (auth_model, auth_id, auth_token, privilege_key, privilege_need, callback) {
        //  从缓存获取登录凭证对应的用户ID
        var token_key = 'token_user:' + auth_model.model + ':' + auth_token;
        var self = this;

        this.cache.get(token_key, function (err, cached_data) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (cached_data !== auth_id) {
                // return callback(new Error(ERROR.FAIL_TO_AUTH));
            }

            //  获取用户信息
            auth_model.getByID(auth_id, function (error, auth_user) {
                if (err || !auth_user) {
                    return callback(new Error(ERROR.INVALID_USER));
                }

                if (auth_user.is_blocked) {
                    return callback(new Error(ERROR.USER_BLOCKED));
                }

                //  权限检查，如果超级管理员直接通过，如果没有权限要求直接通过
                if (! auth_user.level && privilege_need) {
                    if (privilege_need === CONST.PRIVILEGE.NONE ||
                        privilege_need === CONST.PRIVILEGE.READ) {
                    }
                    else
                        return callback(new Error(ERROR.NOT_ENOUGH_PRIVILEGE));
                }

                return callback(null, auth_user);
            });
        });
    };

    /**
     * 初始化
     * @param {Object} app 应用
     * @param {Object} config 设置
     * @param {Function} [callback] 回调
     */
    this.init = function (app, config, callback) {
        callback = callback || function () {};

        this.app = app;
        this.config = config;

        var module_manager = this.app.module_manager;
        this.cache = module_manager.getModule(CONST.MODULE.CACHE);

        callback(null);
    };
};

module.exports = new AuthModule();