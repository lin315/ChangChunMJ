/**
 * Created by leo on 12/3/2017.
 */
var APISession = require('./api_session');

var APIModule = function() {
    this.app = null;
    this.config = null;
    this.Auth = null;

    /**
     * 添加一个路由处理器
     *
     * @param {Object} entry 处理入口
     * @param {String} prefix 路由前缀
     * @param {Model} auth_model 认证模型名称
     * @param {String} privilege_key 所需权限名称
     */
    this.registerRouteEntry = function (entry, prefix, auth_model, privilege_key) {
        var self = this;

        // 路由处理器
        var handler = function (req, res) {
            //  组合所有请求参数
            //  创建API Session
            var api_session = new APISession(self.app);
            api_session.addParams(req.query);
            api_session.addParams(req.body);
            api_session.addParams(req.params);
            api_session.addParams(req.files);
            api_session.set('ip', req.ip.replace("::ffff:", ""));

            var auth_id = api_session.get('auth_id');
            var auth_token = api_session.get('auth_token');

            /**
             * 对最终结果进行处理，将处理结果返回给客户端
             *
             * @param {Error} err 错误对象
             * @param {Object} [data] 结果对象
             */
            var onResult = function (err, data) {
                //  释放所有未释放的锁
                api_session.unlockAll();

                //  失败结果
                if (err) {
                    var err_code = parseInt(err.message);

                    return UTIL.fail(res, err_code);
                }

                //  成功结果
                if (!data)
                    data = {};
                UTIL.success(res, data);
            };

            /**
             * 对登录用户进行认证
             *
             */
            var doAuth = function () {
                if (entry.auth || entry.auth === undefined) {
                    if (!auth_id || !auth_token) {
                        return onResult(new Error(ERROR.FAIL_TO_AUTH));
                    }

                    //  进行用户登录权限验证
                    self.Auth.authenticate(auth_model, auth_id, auth_token, privilege_key, entry.privilege,
                        function (err, auth_user) {
                            if (err || !auth_user) {
                                return onResult(err);
                            }

                            return entry.handler(api_session, auth_user, onResult);
                        });
                }
                else {
                    entry.handler(api_session, null, onResult);
                }
            };

            //  如果需要加锁
            if ((entry.lock || entry.lock === undefined) && !!auth_id) {
                api_session.lock(auth_model.getLockKey(auth_id), function (err) {
                    if (err) {
                        return onResult(new Error(ERROR.INVALID_OPERATION));
                    }

                    doAuth();
                });
            }
            else {
                doAuth();
            }
        };

        //  注册路由
        this.registerRaw(prefix + entry.url, entry.method, handler);
    };

    /**
     * 注册API入口
     *
     * @param {string} prefix URL前缀
     * @param {Model} auth_model 认证模型(UserModel, AdminModel等， 可空)
     * @param {string} privilege_model 所需权限(user, admin等， 可空)
     * @param {Array} entries 事件监听器列表
     * @return {Object} 结果对象
     */
    this.register = function (prefix, auth_model, privilege_model, entries) {
        for (var i = 0; i < entries.length; i++) {
            this.registerRouteEntry(entries[i], prefix, auth_model, privilege_model);
        }
    };

    /**
     * 注册原生API
     *
     * @param {string} url: 路由
     * @param {string} method: 方法
     * @param {function} handler: 处理体
     */
    this.registerRaw = function (url, method, handler) {
        if (method === undefined || method == 'get') {
            this.app.get(url, handler);
        } else if (method == 'put') {
            this.app.put(url, handler);
        } else if (method == 'post') {
            this.app.post(url, handler);
        } else if (method == 'delete') {
            this.app.delete(url, handler);
        }
    };

    /**
     * 初始化
     *
     * @param {Object} app: 应用
     * @param {Object} config: 设置
     * @param {Function} [callback]: 回调
     */
    this.init = function (app, config, callback) {
        callback = callback || function () {};

        this.app = app;
        this.config = config;

        this.Auth = app.module_manager.getModule(CONST.MODULE.AUTH);

        callback(null);
    };
};

module.exports = new APIModule();