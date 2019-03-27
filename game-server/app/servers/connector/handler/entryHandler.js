module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
    this.app = app;

    this.Auth = module_manager.getModule(CONST.MODULE.AUTH);

    /**
     * 用户登录游戏
     *
     * @param msg
     *      user_id - 用户ID
     *      token - Token
     *      lat - 纬度
     *      lon - 经度
     *      address - 当前地址
     * @param session
     * @param next
     */
    this.doTokenLogin = function (msg, session, next) {
        var self = this;

        this.Auth.authenticate(UserModel, msg.user_id, msg.token, '', '', function(err, user) {
            if (err) {
                return next(null, UTIL.failResult(err.message));
            }

            var session_service = self.app.get('sessionService');
            var old_session = session_service.getByUid(user.id);

            var doLogin = function () {
                // 绑定用户
                session.bind(user.id, function (err) {
                    if (err) {
                        return next(null, UTIL.failResult(ERROR.SESSION_BIND_FAILED));
                    }

                    // 2. 向大厅注册成功
                    var onLoginToHallSuccess = function (err, auth_user) {
                        if (err || !auth_user) {
                            return next(null, UTIL.failResult(ERROR.FAIL_LOGIN));
                        }

                        // 2.1 用户离开
                        session.on('closed', self.onUserLeave.bind(self));

                        // 2.2 返回用户信息
                        return next(null, UTIL.successResult(auth_user));
                    };

                    var try_count = 0;
                    var doLoginToHall = function () {
                        try_count++;
                        if (try_count >= 10) {
                            return next(null, UTIL.failResult(ERROR.FAIL_TO_CONNECT_HALL_SERVER));
                        }

                        var ip = '?';
                        try {
                            ip = session.__session__.__socket__.remoteAddress.ip.replace('::ffff:', '');
                        } catch (e) {
                            ip = '?';
                        }

                        try {
                            self.app.rpc.hall.hallRemote.userLogin(session, session.uid, self.app.get('serverId'), ip, msg, onLoginToHallSuccess);
                        } catch (e) {
                            // 大厅服务器尚未启动
                            setTimeout(doLoginToHall, 500);
                        }
                    }

                    // 1. 向大厅服务器添加用户信息
                    doLoginToHall();
                });
            };

            if (!! old_session) {
                // 如果用户重复登录, 提出以前的登录
                session_service.kick(user.id, '重复登录', function (err) {
                    if (err) {
                        return next(null, UTIL.failResult(ERROR.KICK_SESSION_FAILED));
                    }

                    // 等待1s之后再登录
                    setTimeout(function () {
                        doLogin();
                    }, 1000);
                });
            } else {
                // 用户的第一次登录, 直接登录
                doLogin();
            }
        });
    };

    /**
     * 用户离开游戏
     *
     * @param session
     */
    this.onUserLeave = function (session) {
        if (!session || !session.uid) {
            return;
        }

        // 1. 通知大厅
        app.rpc.hall.hallRemote.userDisconnected(session, session.uid, this.app.get('serverId'), function (res) {
        });

        // 2. 通知游戏服务器
        app.rpc.game.gameRemote.userDisconnected(session, session.uid, this.app.get('serverId'), function (res) {
        });
    };
};

