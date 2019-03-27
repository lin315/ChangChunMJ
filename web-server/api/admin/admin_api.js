/**
 * Created by Administrator on 11/4/2017.
 */

var Auth = module_manager.getModule(CONST.MODULE.AUTH);
var Event = module_manager.getModule(CONST.MODULE.EVENT);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  管理员相关
//
//  apiAdminLogin:                  管理员登录
//  apiAdminChangePassword:         修改管理者登录密码
//  apiGetAdminList:                获取管理者列表
//  apiGetAdmin:                    获取管理者详细信息
//  apiCreateAdmin:                 创建管理员
//  apiDeleteAdmin:                 删除管理者信息
//
//  apiGetAdminLog:                 获取管理者操作记录信息
//  apiGetAdminLogList:             获取管理者操作记录列表
//  apiDeleteAdminLog:              删除管理者操作记录信息
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 管理员登录
 *
 * @param api_session: 用户Session
 * @param auth_user: 用户信息
 * @param callback: 回调
 */
var apiAdminLogin = function(api_session, auth_user, callback) {
    var id = api_session.get('id');
    var ip = api_session.get('ip');
    var password = api_session.get('password');

    if (! id || ! password) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  首先进行加锁
    api_session.lock(AdminModel.getLockKey(id), function (err) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        //  根据ID获取管理员信息
        AdminModel.getByID(id, function (error, admin) {
            if (error) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }
            if (!admin) {
                return callback(new Error(ERROR.INVALID_USER));
            }

            if (admin.password != UTIL.encrypt(password)) {
                return callback(new Error(ERROR.INVALID_PASSWORD));
            }

            //  赋予用户权限
            Auth.authorize(AdminModel, admin.id, function (err, token) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                admin.last_login_ip = ip;
                admin.last_login_time = UTIL.getTimeDesc();

                AdminModel.save(admin, function (err) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    admin.password = null;

                    var result = {
                        token : token,
                        user_info: admin
                    };

                    AdminLogModel.addLog(admin.id, CONST.MODEL.ADMIN, '管理员登录', admin.name, api_session.get('ip'));

                    callback(null, result);
                });
            });
        });
    });
};

/**
 * 管理者token登录
 *
 * @param {APISession} api_session Session信息
 * @param {Object} auth_user 用户信息
 * @param {function} callback 回调
 */
var apiAdminTokenLogin = function(api_session, auth_user, callback){
    auth_user.password = null;
    callback(null, auth_user);
};

/**
 * 修改管理者登录密码
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiAdminChangePassword = function (api_session, auth_user, callback){
    var old_password = api_session.get('old_password');
    var new_password = api_session.get('new_password');

    if (auth_user.password != UTIL.encrypt(old_password)) {
        return callback(new Error(ERROR.INVALID_PASSWORD));
    }

    if (new_password == null) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 修改密码
    auth_user.password = UTIL.encrypt(new_password);
    AdminModel.save(auth_user, function (err) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        AdminLogModel.addLog(auth_user.id, CONST.MODEL.ADMIN, '管理员修改密码', auth_user.name, api_session.get('ip'));

        callback(null);
    });
};

/**
 * 获取管理者列表
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetAdminList = function (api_session, auth_user, callback) {
    var id = api_session.get('id');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    AdminModel.getList([['id', 'like', '%' + id + '%']], [], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取管理者详细信息
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetAdmin = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    AdminModel.getByID(id, function (err, admin) {
        if (err || !admin) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        admin.password = null;

        callback(null, admin);
    });
};

/**
 * 创建管理员
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiCreateAdmin = function(api_session, auth_user, callback) {
    var id = api_session.get('id');
    var name = api_session.get('name');
    var password = api_session.get('password');
    var gems = api_session.get('gems');

    if (! id || ! password || ! name || gems < 0 || isNaN(gems)) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    AdminModel.getByID(id, function(err, admin) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (admin) {
            return callback(new Error(ERROR.ACCOUNT_ALREADY_EXISTS));
        }

        admin = {};
        admin.id = id;
        admin.name = name;
        admin.password = UTIL.encrypt(password);
        admin.gems = parseInt(gems);
        admin.created_at = UTIL.getTimeDesc();
        admin.level = AdminModel.LEVEL.NORMAL;

        AdminModel.create(admin, function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            AdminLogModel.addLog(auth_user.id, CONST.MODEL.ADMIN, '新增员工信息', JSON.stringify(admin), api_session.get('ip'));

            callback(null);
        })
    });
};

/**
 * 删除管理者信息
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteAdmin = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    //  进行加锁
    api_session.lock(AdminModel.getLockKey(id), function (err) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        AdminModel.delete(id, function (err) {
            if (err) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            AdminLogModel.addLog(auth_user.id, CONST.MODEL.ADMIN, '删除管理员信息', 'ID:' + id, api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 获取管理者操作记录信息
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetAdminLog = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    AdminLogModel.getByID(id, function (err, admin_log) {
        if (err || !admin_log) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        callback(null, admin_log);
    });
};

/**
 * 获取管理者操作记录列表
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetAdminLogList = function (api_session, auth_user, callback){
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');
    var admin_id = api_session.get('admin_id');
    var title = api_session.get('title');

    var conditions = [];
    if (title && title != '') {
        conditions.push(['title', 'like', '%' + title + '%']);
    }
    if (admin_id && admin_id != '') {
        conditions.push(['admin_id', 'like', '%' + admin_id + '%']);
    }

    AdminLogModel.getList(conditions, [['id', 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 删除管理者操作记录
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteAdminLog = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    //  进行加锁
    api_session.lock(AdminLogModel.getLockKey(id), function (err) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        AdminLogModel.getByID(id, function (err, admin_log) {
            if (err || !admin_log) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            AdminLogModel.delete(id, function (err) {
                if (err) {
                    return callback(new Error(ERROR.MODEL_NOT_FOUND));
                }

                callback(null);
            });
        });
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  用户相关
//
//  apiGetUserList:                 获取用户列表
//  apiGetUser:                     获取用户信息
//  apiSendUserGems:                给用户赠送房卡
//  apiMinusUserGems:               扣取用户房卡
//  apiSendUserMatchGems:           给用户赠送比赛卡
//  apiMinusUserMatchGems:          扣取用户比赛卡
//  apiBindUserDealer:              给用户绑定代理
//  apiBlockUser:                   查封用户
//  apiUnblockUser:                 解封用户
//  apiSetUserDealer:               将用户设置为代理
//  apiUnsetUserDealer:             取消用户代理
//  apiChangeDealerPassword:        修改代理密码
//  apiSetUserVIP:                  将用户设置为会员
//  apiUnsetUserVIP:                取消用户会员
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取用户列表
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetUserList = function (api_session, auth_user, callback){
    var user_id = api_session.get('user_id');
    var name = api_session.get('name');
    var version = api_session.get('version');
    var r_code = api_session.get('r_code');
    var order_by = api_session.get('order_by');
    var filter = api_session.get('filter');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];
    if (user_id && user_id !== '') {
        conditions.push(['id', 'like', '%' + user_id + '%']);
    }
    if (name && name !== '') {
        conditions.push(['name', 'like', '%' + name + '%']);
    }
    if (version && version !== '') {
        conditions.push(['version', 'like', '%' + version + '%']);
    }
    if (r_code && r_code > 0) {
        conditions.push(['r_code', 'like', '%' + r_code + '%']);
    }

    if (filter === 'is_dealer') {
        conditions.push(['is_dealer', UserModel.DEALER.YES]);
    } else if (filter === 'is_online') {
        conditions.push(['is_online', 1]);
    } else if (filter === 'level') {
        conditions.push(['level', UserModel.LEVEL.VIP]);
    } else if (filter === 'is_player') {
        conditions.push(['is_robot', 0]);
    } else if (filter === 'is_robot') {
        conditions.push(['is_robot', 1]);
    }

    if (order_by == null) {
        order_by = 'created_at';
    }

    // 获取用户列表
    UserModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取用户详细
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetUser = function (api_session, auth_user, callback) {
    var id = api_session.get('id');

    UserModel.getByID(id, function (err, user) {
        if (err || !user) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        callback(null, user);
    });
};

/**
 * 给用户赠送房卡
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiSendUserGems = function (api_session, auth_user, callback){
    var id = api_session.get('id');
    var gems = parseInt(api_session.get('gems'));

    if (isNaN(gems) || gems <= 0) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    if (auth_user.level === AdminModel.LEVEL.NORMAL && auth_user.gems < gems) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        //  赠送房卡
        user = {
            id: user.id,
            gems: user.gems + gems
        };

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '赠送用户房卡', 'ID:' + id + ' 房卡:' + gems, api_session.get('ip'));

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    award: gems,
                    gems: user.gems,
                    reason: CONST.REASON.ADMIN_SEND_GEMS
                }
            });

            //  通知游戏服务器，同步更新房卡数
            Event.emit(CONST.EVENT.PLAYER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    award: gems,
                    gems: user.gems,
                    reason: CONST.REASON.ADMIN_SEND_GEMS
                }
            });

            if (auth_user.level === AdminModel.LEVEL.NORMAL) {
                // 一般管理员, 扣取房卡
                AdminModel.save({
                    id: auth_user.id,
                    gems: auth_user.gems - gems
                }, function(err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    callback(null, result);
                });
            } else {
                callback(null);
            }
        });
    });
};

/**
 * 扣取用户房卡
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiMinusUserGems = function (api_session, auth_user, callback){
    var id = api_session.get('id');
    var gems = parseInt(api_session.get('gems'));

    if (isNaN(gems) || gems <= 0) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    if (auth_user.level !== AdminModel.LEVEL.SUPER) {
        return callback(new Error(ERROR.NOT_ENOUGH_PRIVILEGE));
    }

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (gems > user.gems) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        //  扣取房卡
        user = {
            id: user.id,
            gems: user.gems - gems
        };

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '扣取用户房卡', 'ID:' + id + ' 房卡:' + gems, api_session.get('ip'));

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    cost: gems,
                    gems: user.gems,
                    reason: CONST.REASON.ADMIN_MINUS_GEMS
                }
            });

            //  通知游戏服务器，同步更新房卡数
            Event.emit(CONST.EVENT.PLAYER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    award: gems,
                    gems: user.gems,
                    reason: CONST.REASON.ADMIN_MINUS_GEMS
                }
            });

            callback(null);
        });
    });
};

/**
 * 给用户赠送比赛卡
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiSendUserMatchGems = function (api_session, auth_user, callback){
    var id = api_session.get('id');
    var match_gems = parseInt(api_session.get('match_gems'));

    if (isNaN(match_gems) || match_gems <= 0) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        //  赠送比赛卡
        user = {
            id: user.id,
            match_gems: user.match_gems + match_gems
        };

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '赠送用户比赛卡', 'ID:' + id + ' 比赛卡:' + match_gems, api_session.get('ip'));

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    award: match_gems,
                    match_gems: user.match_gems,
                    reason: CONST.REASON.ADMIN_SEND_MATCH_GEMS
                }
            });

            //  通知游戏服务器，同步更新房卡数
            Event.emit(CONST.EVENT.PLAYER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    award: match_gems,
                    match_gems: user.match_gems,
                    reason: CONST.REASON.ADMIN_SEND_MATCH_GEMS
                }
            });

            callback(null);
        });
    });
};

/**
 * 扣取用户比赛卡
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiMinusUserMatchGems = function (api_session, auth_user, callback){
    var id = api_session.get('id');
    var match_gems = parseInt(api_session.get('match_gems'));

    if (isNaN(match_gems) || match_gems <= 0) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (match_gems > user.match_gems) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        //  扣取比赛卡
        user = {
            id: user.id,
            match_gems: user.match_gems - match_gems
        };

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '扣除用户比赛卡', 'ID:' + id + ' 比赛卡:' + match_gems, api_session.get('ip'));

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    cost: match_gems,
                    match_gems: user.match_gems,
                    reason: CONST.REASON.ADMIN_MINUS_MATCH_GEMS
                }
            });

            //  通知游戏服务器，同步更新房卡数
            Event.emit(CONST.EVENT.PLAYER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    cost: match_gems,
                    match_gems: user.match_gems,
                    reason: CONST.REASON.ADMIN_MINUS_MATCH_GEMS
                }
            });

            callback(null);
        });
    });
};

/**
 * 给用户绑定代理
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiBindUserDealer = function (api_session, auth_user, callback){
    var id = api_session.get('id');
    var dealer_id = api_session.get('dealer_id');

    if (! id || ! dealer_id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        UserModel.getByID(dealer_id, function(err, dealer) {
            if (err) {
                UserModel.unlock(id);
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!dealer) {
                UserModel.unlock(id);
                return callback(new Error(ERROR.BIND_DEALER_NOT_FOUND));
            }

            if (dealer.id == user.id) {
                UserModel.unlock(id);

                return callback(new Error(ERROR.BIND_DEALER_SELF));
            }

            //  绑定推荐人
            user = {
                id: user.id,
                r_code: dealer_id
            };

            //  保存用户信息
            UserModel.save(user, function (err) {
                UserModel.unlock(id);

                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                //  保存操作记录
                AdminLogModel.addLog(auth_user.id, UserModel.model, '手动绑定用户的代理', 'ID:' + id + ' 代理ID:' + dealer_id, api_session.get('ip'));

                /*
                //  放到队列中，大厅服务器会读取以后推送给玩家
                Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                    user_id: user.id,
                    data: {
                        award: gems,
                        gems: user.gems,
                        reason: CONST.REASON.ADMIN_SEND_GEMS
                    }
                });

                //  通知游戏服务器，同步更新房卡数
                Event.emit(CONST.EVENT.PLAYER_INFO_CHANGED, {
                    user_id: user.id,
                    data: {
                        award: gems,
                        gems: user.gems,
                        reason: CONST.REASON.ADMIN_SEND_GEMS
                    }
                });
                */

                callback(null);
            });
        });
    });
};

/**
 * 解除用户的代理
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUnbindUserDealer = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        //  绑定推荐人
        user = {
            id: user.id,
            r_code: 0
        };

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '手动解除用户的代理', 'ID:' + id, api_session.get('ip'));

            /*
             //  放到队列中，大厅服务器会读取以后推送给玩家
             Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
             user_id: user.id,
             data: {
             award: gems,
             gems: user.gems,
             reason: CONST.REASON.ADMIN_SEND_GEMS
             }
             });

             //  通知游戏服务器，同步更新房卡数
             Event.emit(CONST.EVENT.PLAYER_INFO_CHANGED, {
             user_id: user.id,
             data: {
             award: gems,
             gems: user.gems,
             reason: CONST.REASON.ADMIN_SEND_GEMS
             }
             });
             */

            callback(null);
        });
    });
};

/**
 * 查封用户
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiBlockUser = function (api_session, auth_user, callback) {
    var id = api_session.get('id');

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        user.is_blocked = 1;

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    is_blocked: user.is_blocked,
                    reason: CONST.REASON.ADMIN_BLOCK_USER
                }
            });

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '查封用户', JSON.stringify(user), api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 解封用户
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUnblockUser = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        user.is_blocked = 0;

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    is_blocked: user.is_blocked,
                    reason: CONST.REASON.ADMIN_UNBLOCK_USER
                }
            });

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '解封用户', JSON.stringify(user), api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 将用户设置为代理
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiSetUserDealer = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        user.is_dealer = UserModel.DEALER.YES;
        user.password = UTIL.encrypt(UserModel.DEFAULT_DEALER_PASSWORD);
        user.dealer_created_at = UTIL.getTimeDesc();

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    is_dealer: user.is_dealer,
                    reason: CONST.REASON.ADMIN_SET_USER_DEALER
                }
            });

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '设置代理', JSON.stringify(user), api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 取消用户代理
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUnsetUserDealer = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        user.is_dealer = UserModel.DEALER.NO;

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    is_dealer: user.is_dealer,
                    reason: CONST.REASON.ADMIN_UNSET_USER_DEALER
                }
            });

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '取消代理', JSON.stringify(user), api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 修改代理密码
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiChangeDealerPassword = function (api_session, auth_user, callback) {
    var user_id = api_session.get('id');
    var password = api_session.get('password');

    if (! password || password === '') {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    UserModel.lockAndGet(user_id, function(err, dealer) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! dealer) {
            UserModel.unlock(user_id);
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        if (dealer.is_dealer !== UserModel.DEALER.YES) {
            UserModel.unlock(user_id);
            return callback(new Error(ERROR.USER_NOT_DEALER));
        }

        dealer.password = UTIL.encrypt(password);

        UserModel.save(dealer, function(err, result) {
            UserModel.unlock(user_id);
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '修改代理密码', JSON.stringify(dealer), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 将用户设置为会员
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiSetUserVIP = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        user.level = UserModel.LEVEL.VIP;

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    level: user.level,
                    reason: CONST.REASON.ADMIN_SET_USER_VIP
                }
            });

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '设置会员', JSON.stringify(user), api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 取消用户会员
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUnsetUserVIP = function (api_session, auth_user, callback){
    var id = api_session.get('id');

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        user.level = UserModel.LEVEL.NORMAL;

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  放到队列中，大厅服务器会读取以后推送给玩家
            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                user_id: user.id,
                data: {
                    level: user.level,
                    reason: CONST.REASON.ADMIN_UNSET_USER_VIP
                }
            });

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '取消会员', JSON.stringify(user), api_session.get('ip'));

            callback(null);
        });
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  房间相关
//
//  apiGetRoomList:                     获取房间列表
//
//
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取房间列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetRoomList = function(api_session, auth_user, callback) {
    var room_id = api_session.get('room_id');
    var creator_id = api_session.get('creator_id');
    var club_id = api_session.get('club_id');
    var order_by = api_session.get('order_by');
    var status = api_session.get('status');
    var game_id = api_session.get('game_id');
    var room_type = api_session.get('room_type');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];
    if (room_id && room_id !== '') {
        conditions.push(['id', 'like', '%' + room_id + '%']);
    }
    if (creator_id && creator_id !== '') {
        conditions.push(['creator', 'like', '%' + creator_id + '%']);
    }
    if (club_id && club_id !== '') {
        conditions.push(['club_id', 'like', '%' + club_id + '%']);
    }
    if (order_by == null) {
        order_by = 'created_at';
    }
    if (status === CONST.ROOM_STATUS.WAITING ||
        status === CONST.ROOM_STATUS.PLAYING ||
        status === CONST.ROOM_STATUS.FINISHED) {
        conditions.push(['status', status]);
    }
    if (game_id === CONST.GAME_ID.YUNCHENG ||
        game_id === CONST.GAME_ID.TUIDAOHU||
        game_id === CONST.GAME_ID.QINSHUI ||
        game_id === CONST.GAME_ID.DOUDIZHU) {
        conditions.push(['game_id', game_id]);
    }
    if (room_type === CONST.ROOM_TYPE.PRIVATE ||
        room_type === CONST.ROOM_TYPE.CLUB ||
        room_type === CONST.ROOM_TYPE.MATCH) {
        conditions.push(['type', room_type]);
    }

    RoomModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  俱乐部相关
//
//  apiGetClubList:                     获取俱乐部列表
//  apiSendClubGems:                    赠送俱乐部房卡
//  apiMinusClubGems:                   扣除俱乐部房卡
//  apiBlockClub:                       查封俱乐部
//  apiUnblockClub:                     解封俱乐部
//
//  apiGetClubMemberList:               获取俱乐部成员列表
//  apiSetClubAdmin:                    设置俱乐部管理员
//  apiUnsetClubAdmin:                  取消俱乐部管理员
//  apiKickClubAdmin:                   踢出俱乐部成员
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取俱乐部列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetClubList = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var creator_id = api_session.get('creator_id');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');
    var order_by = api_session.get('order_by');

    var conditions = [];
    if (club_id && club_id !== '') {
        conditions.push(['id', 'like', '%' + club_id + '%']);
    }
    if (creator_id && creator_id !== '') {
        conditions.push(['creator_id', 'like', '%' + creator_id + '%']);
    }

    //  默认在线用户优先显示
    if (order_by == null) {
        order_by = 'created_at';
    }

    // 获取俱乐部列表
    ClubModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 赠送俱乐部房卡
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiSendClubGems = function (api_session, auth_user, callback) {
    var club_id = api_session.get('id');
    var gems = parseInt(api_session.get('gems'));

    if (isNaN(gems) || gems <= 0) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    if (auth_user.level === AdminModel.LEVEL.NORMAL && auth_user.gems < gems) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  获取俱乐部信息
    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! club) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        // 获取创始人
        UserModel.lockAndGet(club.creator_id, function (err, club_creator) {
            if (err) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            if (!club_creator) {
                UserModel.unlock(club.creator_id);
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            //  赠送俱乐部房卡
            club_creator = {
                id: club_creator.id,
                club_gems: club_creator.club_gems + gems
            };

            //  保存用户信息
            UserModel.save(club_creator, function (err) {
                UserModel.unlock(club_creator.id);

                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                //  保存操作记录
                AdminLogModel.addLog(auth_user.id, UserModel.model, '赠送俱乐部房卡', 'ID:' + club_id + ' 房卡:' + gems, api_session.get('ip'));

                //  推送给俱乐部创始人
                Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                    user_id: club_creator.id,
                    data: {
                        award: gems,
                        club_gems: club_creator.club_gems,
                        reason: CONST.REASON.ADMIN_SEND_CLUB_GEMS
                    }
                });

                if (auth_user.level === AdminModel.LEVEL.NORMAL) {
                    // 一般管理员, 扣取房卡
                    AdminModel.save({
                        id: auth_user.id,
                        gems: auth_user.gems - gems
                    }, function(err, result) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        callback(null, result);
                    });
                } else {
                    callback(null);
                }
            });
        });
    });
};

/**
 * 扣除俱乐部房卡
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiMinusClubGems = function (api_session, auth_user, callback) {
    var club_id = api_session.get('id');
    var gems = parseInt(api_session.get('gems'));

    if (isNaN(gems) || gems <= 0) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    if (auth_user.level !== AdminModel.LEVEL.SUPER) {
        return callback(new Error(ERROR.NOT_ENOUGH_PRIVILEGE));
    }

    //  获取俱乐部信息
    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! club) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        // 获取创始人
        UserModel.lockAndGet(club.creator_id, function (err, club_creator) {
            if (err) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            if (!club_creator) {
                UserModel.unlock(club.creator_id);
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            if (club_creator.club_gems < gems) {
                UserModel.unlock(club.creator_id);
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            //  扣取俱乐部房卡
            club_creator = {
                id: club_creator.id,
                club_gems: club_creator.club_gems - gems
            };

            //  保存用户信息
            UserModel.save(club_creator, function (err) {
                UserModel.unlock(club_creator.id);

                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                //  保存操作记录
                AdminLogModel.addLog(auth_user.id, UserModel.model, '扣取俱乐部房卡', 'ID:' + club_id + ' 房卡:' + gems, api_session.get('ip'));

                //  推送给俱乐部创始人
                Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                    user_id: club_creator.id,
                    data: {
                        cost: gems,
                        club_gems: club_creator.club_gems,
                        reason: CONST.REASON.ADMIN_MINUS_CLUB_GEMS
                    }
                });

                callback(null);
            });
        });
    });
};

/**
 * 查封俱乐部
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiBlockClub = function (api_session, auth_user, callback) {
    var club_id = api_session.get('id');

    //  获取俱乐部信息
    ClubModel.lockAndGet(club_id, function (err, club) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! club) {
            ClubModel.unlock(club_id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        club.is_blocked = 1;

        //  保存俱乐部信息
        ClubModel.save(club, function (err) {
            ClubModel.unlock(club_id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 推送...

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, ClubModel.model, '查封俱乐部', JSON.stringify(club), api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 解封俱乐部
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUnblockClub = function (api_session, auth_user, callback){
    var club_id = api_session.get('id');

    //  获取俱乐部信息
    ClubModel.lockAndGet(club_id, function (err, club) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! club) {
            ClubModel.unlock(club_id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        club.is_blocked = 0;

        //  保存俱乐部信息
        ClubModel.save(club, function (err) {
            ClubModel.unlock(club_id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 推送...

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, ClubModel.model, '解封俱乐部', JSON.stringify(club), api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 获取俱乐部成员列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetClubMemberList = function (api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var member_id = api_session.get('member_id');
    var status = api_session.get('status');
    var position = api_session.get('position');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');
    var order_by = api_session.get('order_by');

    var conditions = [];
    if (club_id && club_id !== '') {
        conditions.push(['club_id', 'like', '%' + club_id + '%']);
    }
    if (member_id && member_id !== '') {
        conditions.push(['member_id', 'like', '%' + member_id + '%']);
    }
    if (status && status !== '') {
        conditions.push(['status', 'like', '%' + status + '%']);
    }
    if (position && position !== '') {
        conditions.push(['position', 'like', '%' + position + '%']);
    }

    //  默认在线用户优先显示
    if (order_by == null) {
        order_by = 'created_at';
    }

    // 获取俱乐部成员列表
    ClubMemberModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 设置俱乐部管理员
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiSetClubAdmin = function (api_session, auth_user, callback) {
    var club_member_id = api_session.get('id');

    ClubMemberModel.getByID(club_member_id, function(err, club_member) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club_member) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        // 更新成员的position
        club_member.position = ClubMemberModel.POSITION.ADMIN;

        ClubMemberModel.save(club_member, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            ClubModel.getByID(club_member.club_id, function(err, club) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (!club) {
                    return callback(new Error(ERROR.INVALID_PARAMS));
                }

                // 插入position
                club.position = ClubMemberModel.POSITION.ADMIN;

                // 推送俱乐部管理员
                Event.emit(CONST.EVENT.CLUB_ADMIN_CHANGED_TO_MEMBER, {
                    user_id: club_member.member_id,
                    data: {
                        club: club,
                        reason: CONST.REASON.CLUB_ADMIN_AWARDED
                    }
                });

                callback(null, null);
            });
        });
    });
};

/**
 * 取消俱乐部管理员
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiUnsetClubAdmin = function (api_session, auth_user, callback) {
    var club_member_id = api_session.get('id');

    ClubMemberModel.getByID(club_member_id, function(err, club_member) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club_member) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        // 更新成员的position
        club_member.position = ClubMemberModel.POSITION.MEMBER;

        ClubMemberModel.save(club_member, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            ClubModel.getByID(club_member.club_id, function(err, club) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (!club) {
                    return callback(new Error(ERROR.INVALID_PARAMS));
                }

                // 插入position
                club.position = ClubMemberModel.POSITION.MEMBER;

                // 推送俱乐部管理员
                Event.emit(CONST.EVENT.CLUB_ADMIN_CHANGED_TO_MEMBER, {
                    user_id: club_member.member_id,
                    data: {
                        club: club,
                        reason: CONST.REASON.CLUB_ADMIN_AWARDED
                    }
                });

                callback(null, null);
            });
        });
    });
};

/**
 * 踢出俱乐部成员
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiKickClubAdmin = function (api_session, auth_user, callback) {
    var club_member_id = api_session.get('id');

    ClubMemberModel.getByID(club_member_id, function(err, club_member) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (!club_member) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        ClubModel.getByID(club_member.club_id, function(err, club) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!club) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            ClubMemberModel.delete(club_member.id, function (err) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 推送给被删除成员
                Event.emit(CONST.EVENT.CLUB_INFO_CHANGED_TO_MEMBER, {
                    user_id: club_member.member_id,
                    data: {
                        club_id: club.id,
                        club_name: club.name,
                        reason: CONST.REASON.CLUB_MEMBER_FIRED
                    }
                });

                // 要从大厅俱乐部通道删除
                Event.emit(CONST.EVENT.CLUB_MEMBER_DELETED, {
                    user_id: club_member.member_id,
                    club_id: club.id
                });

                // 删除成功
                return callback(null, true);
            });
        });
    });
};

/**
 * 获取俱乐部统计信息
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetClubStatistics = function (api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var creator_id = api_session.get('creator_id');
    var date = api_session.get('date');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');
    var order_by = api_session.get('order_by');

    var date_max_time = date + " 23:59:59";

    var conditions = [];
    if (club_id && club_id !== '') {
        conditions.push(['id', 'like', '%' + club_id + '%']);
    }
    if (creator_id && creator_id !== '') {
        conditions.push(['creator_id', 'like', '%' + creator_id + '%']);
    }
    conditions.push(['created_at', '<=', date_max_time]);

    //  默认在线用户优先显示
    if (order_by == null) {
        order_by = 'created_at';
    }

    var getWeight = function(club) {
        switch (order_by) {
            default:
            case 'created_at':
                return club.created_at;

            case 'total_member_count':
                return club.total_member_count;

            case 'active_member_count':
                return club.active_member_count;

            case 'day_room_count':
                return club.day_room_count;

            case 'total_room_count':
                return club.total_room_count;
        }
    };

    // 获取俱乐部列表
    ClubModel.getByFields(conditions, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        var proceed_count = 0;

        var doGetOneClubStatisticsFinished = function() {
            if (proceed_count === result.length) {
                // 重新排序
                for (var i = 0; i < result.length - 1; i++) {
                    for (var j = i + 1; j < result.length; j++) {
                        if (getWeight(result[i]) < getWeight(result[j])) {
                            var tmp = result[i];
                            result[i] = result[j];
                            result[j] = tmp;
                        }
                    }
                }

                // 分页处理
                var list = [];
                page_no = page_no > 0 ? page_no : 1;
                page_size = page_size > 0 ? page_size : 1;
                var total_count = result.length;
                var show_count = page_size;
                var page_count = Math.ceil(total_count / page_size);

                for (var i = 0; i < show_count; i++) {
                    var offset = (page_no - 1) * page_size + i;
                    if (offset < result.length) {
                        list.push(result[offset]);
                    }
                }

                return callback(null, {
                    list: list,
                    page_no: page_no,
                    page_count: page_count,
                    page_size: page_size,
                    total_count: total_count,
                    show_count: show_count
                });
            }
        };

        var doGetOneClubStatistics = function(club) {
            ClubMemberModel.getByFields([
                ['club_id', club.id],
                ['status', ClubMemberModel.STATUS.APPROVED],
                ['created_at', '<=', date_max_time]
            ], function(err, club_member_list) {
                if (err) {
                    proceed_count ++;
                    console.log('获取俱乐部统计信息失败', club, err);
                    return doGetOneClubStatisticsFinished();
                }

                // 1. 所有成员数
                var doAppendTotalMemberCount = function(callback) {
                    return callback(null, club_member_list.length);
                };

                // 2. 活跃成员数
                var doAppendActiveMemberCount = function(days, callback) {
                    var active_member_count = 0;
                    var proceed_club_member_count = 0;

                    var appendMemberCountFinished = function() {
                        if (proceed_club_member_count === club_member_list.length) {
                            callback(null, active_member_count);
                        }
                    };

                    var doGetOneClubMemberRoomCount = function(club_member) {
                        RoomModel.getByFields([
                            ['type', RoomModel.TYPE.CLUB],
                            ['club_id', club.id],
                            ['players', 'like', '%' + (club_member.member_id) + '%'],
                            ['status', CONST.ROOM_STATUS.FINISHED],
                            ['finished_at', 'like', date + '%']
                        ], function (err, room_list) {
                            proceed_club_member_count ++;

                            if (! err) {
                                // 计算活跃因子
                                if (room_list.length >= days) {
                                    active_member_count++;
                                }
                            }

                            appendMemberCountFinished();
                        });
                    };

                    for (var i = 0; i < club_member_list.length; i++) {
                        var club_member = club_member_list[i];

                        doGetOneClubMemberRoomCount(club_member);
                    }
                };

                // 3. 指定日期房间数
                var doAppendDayRoomCount = function(callback) {
                    RoomModel.getCountEx([
                        ['type', RoomModel.TYPE.CLUB],
                        ['club_id', club.id],
                        ['status', CONST.ROOM_STATUS.FINISHED],
                        ['finished_at', 'like', date + '%']
                    ], callback);
                };

                // 4. 指定日期以前的所有游戏房间数量
                var doAppendTotalRoomCount = function(callback) {
                    RoomModel.getCountEx([
                        ['type', RoomModel.TYPE.CLUB],
                        ['club_id', club.id],
                        ['status', CONST.ROOM_STATUS.FINISHED],
                        ['finished_at', '<=', date_max_time]
                    ], callback);
                };

                doAppendTotalMemberCount(function(err1, total_member_count) {
                    doAppendActiveMemberCount(1, function(err2, active_member_count) {
                        doAppendDayRoomCount(function(err3, day_room_count) {
                            doAppendTotalRoomCount(function(err4, total_room_count) {
                                proceed_count ++;
                                if (err1 || err2 || err3 || err4) {
                                    console.log('获取俱乐部统计信息失败', err1, err2, err3, err4);
                                    return doGetOneClubStatisticsFinished();
                                }

                                club.total_member_count = total_member_count;
                                club.active_member_count = active_member_count;
                                club.day_room_count = day_room_count;
                                club.total_room_count = total_room_count;

                                doGetOneClubStatisticsFinished();
                            });
                        });
                    });
                });
            });
        };

        for (var i = 0; i < result.length; i++) {
            var club = result[i];
            doGetOneClubStatistics(club);
        }

        if (result.length === 0) {
            return doGetOneClubStatisticsFinished();
        }
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  系统设置相关
//
//  apiGetSystemSettings:               获取系统设置
//  apiUpdateSystemSettings:            更新系统设置
//
//  apiGetMessages:                     获取消息列表
//  apiUpdateMessage:                   更新消息
//
//  apiGetStatistics:                   获取系统统计
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取系统设置
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetSystemSettings = function(api_session, auth_user, callback) {
    SettingModel.getSettings(function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 更新系统设置
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUpdateSystemSettings = function(api_session, auth_user, callback) {
    var check_in_award = api_session.get('check_in_award');
    var sign_in_gems = api_session.get('sign_in_gems');
    var sign_in_match_gems = api_session.get('sign_in_match_gems');
    var share_award = api_session.get('share_award');

    var min_award_on_feedback = api_session.get('min_award_on_feedback');
    var max_award_on_feedback = api_session.get('max_award_on_feedback');

    // 俱乐部
    var create_club_gems = api_session.get('create_club_gems');
    var max_create_club_count = api_session.get('max_create_club_count');
    var max_join_club_count = api_session.get('max_join_club_count');
    var max_club_member_count = api_session.get('max_club_member_count');
    var max_club_admin_count = api_session.get('max_club_admin_count');

    // 比赛场
    var max_match_field_player_count = api_session.get('max_match_field_player_count');
    var day_match_champion_award = api_session.get('day_match_champion_award');
    var day_match_second_place_award = api_session.get('day_match_second_place_award');
    var day_match_third_place_award = api_session.get('day_match_third_place_award');
    var day_match_min_player_count = api_session.get('day_match_min_player_count');
    var week_match_champion_award = api_session.get('week_match_champion_award');
    var week_match_second_place_award = api_session.get('week_match_second_place_award');
    var week_match_third_place_award = api_session.get('week_match_third_place_award');
    var week_match_min_player_count = api_session.get('week_match_min_player_count');
    var day_match_begin_at_hour = api_session.get('day_match_begin_at_hour');
    var day_match_end_at_hour = api_session.get('day_match_end_at_hour');
    var week_match_start_day = api_session.get('week_match_start_day');
    var week_match_start_at_hour = api_session.get('week_match_start_at_hour');
    var match_round_count = api_session.get('match_round_count');
    var enter_day_match_field_gems = api_session.get('enter_day_match_field_gems');
    var enter_week_match_field_gems = api_session.get('enter_week_match_field_gems');
    var match_field_init_score = api_session.get('match_field_init_score');

    var gate_address = api_session.get('gate_address');
    var gate_port = api_session.get('gate_port');
    var app_web_url = api_session.get('app_web_url');
    var dealer_site_url = api_session.get('dealer_site_url');
    var wechat_hotline = api_session.get('wechat_hotline');

    var is_ios_review = api_session.get('is_ios_review');

    SettingModel.getSettings(function (err, settings) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        settings = {
            id: settings.id,
            check_in_award: check_in_award,
            sign_in_gems: sign_in_gems,
            sign_in_match_gems: sign_in_match_gems,
            share_award: share_award,
            min_award_on_feedback: min_award_on_feedback,
            max_award_on_feedback: max_award_on_feedback,

            create_club_gems: create_club_gems,
            max_create_club_count: max_create_club_count,
            max_join_club_count: max_join_club_count,
            max_club_member_count: max_club_member_count,
            max_club_admin_count: max_club_admin_count,

            max_match_field_player_count: max_match_field_player_count,
            day_match_champion_award: day_match_champion_award,
            day_match_second_place_award: day_match_second_place_award,
            day_match_third_place_award: day_match_third_place_award,
            day_match_min_player_count: day_match_min_player_count,
            week_match_champion_award: week_match_champion_award,
            week_match_second_place_award: week_match_second_place_award,
            week_match_third_place_award: week_match_third_place_award,
            week_match_min_player_count: week_match_min_player_count,
            day_match_begin_at_hour: day_match_begin_at_hour,
            day_match_end_at_hour: day_match_end_at_hour,
            week_match_start_day: week_match_start_day,
            week_match_start_at_hour: week_match_start_at_hour,
            match_round_count: match_round_count,
            enter_day_match_field_gems: enter_day_match_field_gems,
            enter_week_match_field_gems: enter_week_match_field_gems,
            match_field_init_score: match_field_init_score,

            gate_address: gate_address,
            gate_port: gate_port,
            app_web_url: app_web_url,
            dealer_site_url: dealer_site_url,
            wechat_hotline: wechat_hotline,

            is_ios_review: is_ios_review
        };

        SettingModel.save(settings, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            callback(null, result);
        });
    });
};

/**
 * 获取消息列表
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetMessages = function(api_session, auth_user, callback) {
    MessageModel.getAll(function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 更新消息
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUpdateMessage = function(api_session, auth_user, callback) {
    var id = api_session.get('id');
    var content = api_session.get('content');

    if (! id || ! content) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    MessageModel.getByID(id, function (err, message) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        message = {
            id: message.id,
            content: content,
            created_at: UTIL.getTimeDesc()
        };

        MessageModel.save(message, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            callback(null, result);
        });
    });
};

/**
 * 获取系统统计
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetStatistics = function(api_session, auth_user, callback) {
    var date = api_session.get('date');
    var type = api_session.get('date_type');

    if (! date || ! type) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }
    var conditions = [];
    conditions.push(['type', type]);
    conditions.push(['date', 'like', date + '%']);

    StatisticModel.getByFields(conditions, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        return callback(null, result);
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  代理相关(暂时保留)
//
//  apiGetDealerRates:                  获取代理抽水比例
//  apiUpdateDealerRate:                更新代理抽水比例
//  apiDeleteDealerRate:                删除代理抽水比例
//  apiCreateDealerRate:                创建代理抽水比例
//
//  apiGetDealerWithdraws:              获取代理提现申请
//  apiAcceptDealerWithdraw:            接受代理提现申请
//  apiRejectDealerWithdraw:            拒绝代理提现申请
//  apiDeleteDealerWithdraw:            删除代理提现申请
//
//  apiGetDealerRequests:               获取代理注册申请
//  apiAcceptDealerRequests:            接受代理注册申请
//  apiRejectDealerRequests:            拒绝代理注册申请
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取代理抽水比例
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetDealerRates = function (api_session, auth_user, callback) {
    DealerRateModel.getAll(function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 更新代理抽水比例
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUpdateDealerRate = function(api_session, auth_user, callback) {
    var id = api_session.get('id');
    var min_count = parseInt(api_session.get('min_count'));
    var max_count = parseInt(api_session.get('max_count'));
    var first_rate = parseFloat(api_session.get('first_rate'));
    var second_rate = parseFloat(api_session.get('second_rate'));

    if (! id || isNaN(min_count) || isNaN(max_count) || isNaN(first_rate) || isNaN(second_rate) ||
        min_count < 0 || max_count < 0 || first_rate < 0 || second_rate < 0 || first_rate >= 100 || second_rate >= 100) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    DealerRateModel.getByID(id, function (err, dealer_rate) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        dealer_rate = {
            id: dealer_rate.id,
            min_count: min_count,
            max_count: max_count,
            first_rate: first_rate,
            second_rate: second_rate,
            created_at: UTIL.getTimeDesc()
        };

        DealerRateModel.save(dealer_rate, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, DealerRateModel.model, '更新代理抽水比例', JSON.stringify(dealer_rate), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 删除代理抽水比例
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteDealerRate = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    DealerRateModel.getByID(id, function (err, dealer_rate) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        DealerRateModel.delete(id, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, DealerRateModel.model, '删除代理抽水比例', JSON.stringify(dealer_rate), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 创建代理抽水比例
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiCreateDealerRate = function(api_session, auth_user, callback) {
    var min_count = parseInt(api_session.get('min_count'));
    var max_count = parseInt(api_session.get('max_count'));
    var first_rate = parseFloat(api_session.get('first_rate'));
    var second_rate = parseFloat(api_session.get('second_rate'));

    if (isNaN(min_count) || isNaN(max_count) || isNaN(first_rate) || isNaN(second_rate) ||
        min_count < 0 || max_count < 0 || first_rate < 0 || second_rate < 0 || first_rate >= 100 || second_rate >= 100) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    var dealer_rate = {
        min_count: min_count,
        max_count: max_count,
        first_rate: first_rate,
        second_rate: second_rate,
        created_at: UTIL.getTimeDesc()
    };

    DealerRateModel.create(dealer_rate, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        //  保存操作记录
        AdminLogModel.addLog(auth_user.id, DealerRateModel.model, '添加代理抽水比例', JSON.stringify(dealer_rate), api_session.get('ip'));

        callback(null, result);
    });
};

/**
 * 获取代理提现申请列表
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetDealerWithdraws = function (api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');


    var conditions = [];
    if (user_id && user_id != '') {
        conditions.push(['user_id', 'like', '%' + user_id + '%']);
    }

    //  获取列表
    DealerWithdrawModel.getList(conditions, [['created_at', 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 接受代理提现申请
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiAcceptDealerWithdraw = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 根据ID获取代理提现申请
    DealerWithdrawModel.getByID(id, function (err, dealer_withdraw) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! dealer_withdraw) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        // 更新状态
        dealer_withdraw.status = DealerWithdrawModel.STATUS.ACCEPTED;

        DealerWithdrawModel.save(dealer_withdraw, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, DealerWithdrawModel.model, '接受代理提现申请', JSON.stringify(dealer_withdraw), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 拒绝代理提现申请
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiRejectDealerWithdraw = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 根据ID获取代理提现申请
    DealerWithdrawModel.getByID(id, function (err, dealer_withdraw) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! dealer_withdraw) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        // 更新状态
        dealer_withdraw.status = DealerWithdrawModel.STATUS.REJECTED;

        DealerWithdrawModel.save(dealer_withdraw, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 要退回代理的红利
            UserModel.lockAndGet(dealer_withdraw.user_id, function (err, user) {
                if (err || !user) {
                    return callback(new Error(ERROR.MODEL_NOT_FOUND));
                }

                if (user.is_dealer == UserModel.DEALER.YES) {
                    user.money += dealer_withdraw.amount;
                }

                //  保存用户信息
                UserModel.save(user, function (err) {
                    UserModel.unlock(id);

                    //  保存操作记录
                    AdminLogModel.addLog(auth_user.id, DealerWithdrawModel.model, '拒绝代理提现申请', JSON.stringify(dealer_withdraw), api_session.get('ip'));

                    callback(null, result);
                });
            });
        });
    });
};

/**
 * 删除代理提现申请
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteDealerWithdraw = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 根据ID获取代理提现申请
    DealerWithdrawModel.getByID(id, function (err, dealer_withdraw) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! dealer_withdraw) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        DealerWithdrawModel.delete(id, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, DealerWithdrawModel.model, '删除代理提现申请', JSON.stringify(dealer_withdraw), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 获取代理注册申请
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetDealerRequests = function (api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');
    var wechat_account = api_session.get('wechat_account');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];

    conditions.push(['is_dealer', UserModel.DEALER.WAITING]);

    if (user_id && user_id !== '') {
        conditions.push(['user_id', 'like', '%' + user_id + '%']);
    }
    if (wechat_account && wechat_account !== '') {
        conditions.push(['wechat_account', 'like', '%' + wechat_account + '%']);
    }

    //  获取列表
    UserModel.getList(conditions, [['created_at', 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 接受代理注册申请
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiAcceptDealerRequests = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err || !user) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        user.is_dealer = UserModel.DEALER.YES;

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 短信通知给代理


            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '同意代理注册申请', JSON.stringify(user), api_session.get('ip'));

            callback(null);
        });
    });
};

/**
 * 拒绝代理注册申请
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiRejectDealerRequests = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  获取用户信息
    UserModel.lockAndGet(id, function (err, user) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (! user) {
            UserModel.unlock(user_id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        user.is_dealer = UserModel.DEALER.NO;

        //  保存用户信息
        UserModel.save(user, function (err) {
            UserModel.unlock(id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            /*
             //  放到队列中，大厅服务器会读取以后推送给玩家
             Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
             user_id: user.id,
             data: {
             is_dealer: user.is_dealer,
             reason: CONST.REASON.ADMIN_UNSET_USER_DEALER
             }
             });
             */

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, UserModel.model, '拒绝代理注册申请', JSON.stringify(user), api_session.get('ip'));

            callback(null);
        });
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  商品相关(暂时保留)
//
//  apiGetGoods:                        获取商品列表
//  apiDeleteGood:                      删除商品
//  apiUpdateGood:                      更新商品
//  apiCreateGood:                      添加商品
//
//  apiGetOrderLogs:                    获取购买记录列表
//  apiDeleteOrderLog:                  删除购买记录
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取商品列表
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetGoods = function (api_session, auth_user, callback) {
    GoodModel.getAll(function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 删除商品
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteGood = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 根据ID获取代理提现申请
    GoodModel.getByID(id, function (err, good) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! good) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        GoodModel.delete(id, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            // AdminLogModel.addLog(auth_user.id, good.model, '删除商品', JSON.stringify(good), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 更新商品
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiUpdateGood = function(api_session, auth_user, callback) {
    var id = api_session.get('id');
    var type = api_session.get('type');
    var name = api_session.get('name');
    var count = parseInt(api_session.get('count'));
    var price = parseFloat(api_session.get('price'));
    var is_promoted = parseInt(api_session.get('is_promoted'));

    if (! id || ! type || ! name || isNaN(count) || isNaN(price) || count <= 0 || price <= 0) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    GoodModel.getByID(id, function (err, good) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        good = {
            id: good.id,
            type: type,
            name: name,
            count: count,
            price: price,
            is_promoted: is_promoted
        };

        GoodModel.save(good, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            // AdminLogModel.addLog(auth_user.id, GoodModel.model, '更新商品', JSON.stringify(good), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 添加商品
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiCreateGood = function(api_session, auth_user, callback) {
    var type = api_session.get('type');
    var name = api_session.get('name');
    var count = parseInt(api_session.get('count'));
    var price = parseFloat(api_session.get('price'));
    var is_promoted = parseInt(api_session.get('is_promoted'));

    if (! type || ! name || isNaN(count) || isNaN(price) || count <= 0 || price <= 0) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }
    var good = {
        type: type,
        name: name,
        count: count,
        price: price,
        is_promoted: is_promoted,
        created_at: UTIL.getTimeDesc()
    };

    GoodModel.create(good, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        //  保存操作记录
        // AdminLogModel.addLog(auth_user.id, GoodModel.model, '添加商品', JSON.stringify(good), api_session.get('ip'));

        callback(null, result);
    });
};

/**
 * 获取购买记录列表
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetOrderLogs = function (api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');
    var type = api_session.get('type');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');


    var conditions = [];
    if (user_id && user_id != '') {
        conditions.push(['user_id', 'like', '%' + user_id + '%']);
    }
    if (type && type != '') {
        conditions.push(['type', 'like', '%' + type + '%']);
    }

    //  获取列表
    OrderLogModel.getList(conditions, [['created_at', 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 删除购买记录
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteOrderLog = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 根据ID获取代理提现申请
    OrderLogModel.getByID(id, function (err, order_log) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! order_log) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        OrderLogModel.delete(id, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            if (order_log.TYPE == OrderLogModel.TYPE.USER_PURCHASE) {
                AdminLogModel.addLog(auth_user.id, OrderLogModel.model, '删除购买记录', JSON.stringify(order_log), api_session.get('ip'));
            } else if (order_log.TYPE == OrderLogModel.TYPE.FIRST_INCOME) {
                AdminLogModel.addLog(auth_user.id, OrderLogModel.model, '删除代理一级收入记录', JSON.stringify(order_log), api_session.get('ip'));
            } else if (order_log.TYPE == OrderLogModel.TYPE.SECOND_INCOME) {
                AdminLogModel.addLog(auth_user.id, OrderLogModel.model, '删除代理二级收入记录', JSON.stringify(order_log), api_session.get('ip'));
            }

            callback(null, result);
        });
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  反馈相关
//
//  apiGetFeedbacks:                    获取反馈列表
//  apiAcceptFeedback:                  接受反馈信息
//  apiDeleteFeedback:                  删除反馈信息
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取反馈列表
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetFeedbacks = function (api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');
    var status = api_session.get('status');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];
    if (user_id && user_id !== '') {
        conditions.push(['user_id', 'like', '%' + user_id + '%']);
    }
    if (status && status !== '') {
        conditions.push(['status', status]);
    }

    //  获取列表
    FeedbackModel.getList(conditions, [['created_at', 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 接受反馈信息
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiAcceptFeedback = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    FeedbackModel.getByID(id, function (err, feedback) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! feedback) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        // 更新状态
        feedback.status = FeedbackModel.STATUS.ACCEPTED;

        FeedbackModel.save(feedback, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, FeedbackModel.model, '受理反馈记录', JSON.stringify(feedback), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 删除反馈信息
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteFeedback = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    FeedbackModel.getByID(id, function (err, feedback) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! feedback) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        FeedbackModel.delete(id, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, FeedbackModel.model, '删除反馈记录', JSON.stringify(feedback), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 获取比赛场列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetMatchFieldList = function(api_session, auth_user, callback) {
    var match_field_id = api_session.get('match_field_id');
    var order_by = api_session.get('order_by');
    var status = api_session.get('status');
    var type = api_session.get('type');
    var year = api_session.get('year');
    var month = api_session.get('month');
    var start_hour_in_24 = api_session.get('start_hour_in_24');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];
    if (match_field_id && match_field_id !== '') {
        conditions.push(['id', 'like', '%' + match_field_id + '%']);
    }
    if (status && status !== '') {
        conditions.push(['status', status]);
    }
    if (type && type !== '') {
        conditions.push(['type', type]);
    }
    if (start_hour_in_24 && start_hour_in_24 !== '') {
        conditions.push(['start_hour_in_24', start_hour_in_24]);
    }
    var date = '';
    if (year && year !== '') {
        date = year;
    }
    if (month && month !== '') {
        if (month < 10) {
            month = '0' + month;
        }

        date += '-' + month + '-';
    }
    if (date !== '') {
        conditions.push(['created_at', 'like', '%' + (date) + '%']);
    }

    //  获取列表
    MatchFieldModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取比赛场报名列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetMatchEntryFormList = function(api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');
    var order_by = api_session.get('order_by');
    var status = api_session.get('status');
    var type = api_session.get('type');
    var year = api_session.get('year');
    var month = api_session.get('month');
    var start_hour_in_24 = api_session.get('start_hour_in_24');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];
    if (user_id && user_id !== '') {
        conditions.push(['user_id', 'like', '%' + user_id + '%']);
    }
    if (status && status !== '') {
        conditions.push(['status', status]);
    }
    if (type && type !== '') {
        conditions.push(['type', type]);
    }
    if (start_hour_in_24 && start_hour_in_24 !== '') {
        if (start_hour_in_24 < 10) {
            start_hour_in_24 = '0' + start_hour_in_24;
        }
        conditions.push(['match_start_time', 'like', '%' + start_hour_in_24 + ':' + '%']);
    }
    var date = '';
    if (year && year !== '') {
        date = year;
    }
    if (month && month !== '') {
        if (month < 10) {
            month = '0' + month;
        }

        date += '-' + month + '-';
    }
    if (date !== '') {
        conditions.push(['created_at', 'like', '%' + (date) + '%']);
    }

    //  获取列表
    MatchEntryFormModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 删除比赛场报名记录
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteMatchEntryForm = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    MatchEntryFormModel.getByID(id, function (err, match_entry_form) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! match_entry_form) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        MatchEntryFormModel.delete(id, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, MatchEntryFormModel.model, '删除比赛场报名记录', JSON.stringify(match_entry_form), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 获取比赛场获奖者列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetMatchWinnerList = function(api_session, auth_user, callback) {
    var match_field_id = api_session.get('match_field_id');
    var user_id = api_session.get('user_id');
    var order_by = api_session.get('order_by');
    var type = api_session.get('type');
    var bonus_awarded = api_session.get('bonus_awarded');
    var year = api_session.get('year');
    var month = api_session.get('month');
    var start_hour_in_24 = api_session.get('start_hour_in_24');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];
    if (match_field_id && match_field_id !== '') {
        conditions.push(['match_field_id', 'like', '%' + match_field_id + '%']);
    }
    if (user_id && user_id !== '') {
        conditions.push(['user_id', 'like', '%' + user_id + '%']);
    }
    if (type && type !== '') {
        conditions.push(['match_field_type', type]);
    }
    if (start_hour_in_24 && start_hour_in_24 !== '') {
        conditions.push(['match_field_start_hour_in_24', start_hour_in_24]);
    }
    if (bonus_awarded && bonus_awarded !== '') {
        conditions.push(['bonus_awarded', bonus_awarded]);
    }
    var date = '';
    if (year && year !== '') {
        date = year;
    }
    if (month && month !== '') {
        if (month < 10) {
            month = '0' + month;
        }

        date += '-' + month + '-';
    }
    if (date !== '') {
        conditions.push(['created_at', 'like', '%' + (date) + '%']);
    }

    //  获取列表
    MatchWinnerModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};
/**
 * 删除获奖记录
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDeleteMatchWinner = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    MatchWinnerModel.getByID(id, function (err, match_winner) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! match_winner) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        MatchWinnerModel.delete(id, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, MatchWinnerModel.model, '删除比赛场报名记录', JSON.stringify(match_winner), api_session.get('ip'));

            callback(null, result);
        });
    });
};

/**
 * 发放奖励
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiAwardMatchWinner = function(api_session, auth_user, callback) {
    var id = api_session.get('id');

    if (! id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    MatchWinnerModel.getByID(id, function (err, match_winner) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! match_winner) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        MatchWinnerModel.save({
            id: id,
            bonus_awarded: true
        }, function (err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            //  保存操作记录
            AdminLogModel.addLog(auth_user.id, MatchWinnerModel.model, '已发放奖励给比赛场获奖者', JSON.stringify(match_winner), api_session.get('ip'));

            callback(null, result);
        });
    });
};

exports.init = function(main_app) {
    app = main_app;

    var prefix = '/api/v1/admin';

    var API = module_manager.getModule(CONST.MODULE.API);
    API.register(prefix, AdminModel, CONST.MODEL.ADMIN, [
        // 管理员相关
        {
            url: '/login',
            handler: apiAdminLogin,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/info',
            handler: apiAdminTokenLogin,
            method: 'post'
        },
        {
            url: '/password',
            handler: apiAdminChangePassword,
            method: 'put'
        },
        {
            url: '/admins',
            handler: apiGetAdminList,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/admin/:id',
            handler: apiGetAdmin,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/admin',
            handler: apiCreateAdmin,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/admin/:id',
            handler: apiDeleteAdmin,
            method: 'delete',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/admin_log/:id',
            handler: apiGetAdminLog,
            method: 'get',
            privilege:  CONST.PRIVILEGE.READ
        },
        {
            url: '/admin_logs',
            handler: apiGetAdminLogList,
            method: 'get',
            privilege:  CONST.PRIVILEGE.READ
        },
        {
            url: '/admin_log/:id',
            handler: apiDeleteAdminLog,
            method: 'delete',
            privilege:  CONST.PRIVILEGE.WRITE
        },

        // 用户相关
        {
            url: '/users',
            handler: apiGetUserList,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/user/:id',
            handler: apiGetUser,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/user/:id/plus_gems',
            handler: apiSendUserGems,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/minus_gems',
            handler: apiMinusUserGems,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/plus_match_gems',
            handler: apiSendUserMatchGems,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/minus_match_gems',
            handler: apiMinusUserMatchGems,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/bind_dealer',
            handler: apiBindUserDealer,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/unbind_dealer',
            handler: apiUnbindUserDealer,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/block',
            handler: apiBlockUser,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/unblock',
            handler: apiUnblockUser,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/set_dealer',
            handler: apiSetUserDealer,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/unset_dealer',
            handler: apiUnsetUserDealer,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/password',
            handler: apiChangeDealerPassword,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/set_vip',
            handler: apiSetUserVIP,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/user/:id/unset_vip',
            handler: apiUnsetUserVIP,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 房间相关
        {
            url: '/rooms',
            handler: apiGetRoomList,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },

        // 俱乐部相关
        {
            url: '/clubs',
            handler: apiGetClubList,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/club/:id/plus_gems',
            handler: apiSendClubGems,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/club/:id/minus_gems',
            handler: apiMinusClubGems,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/club/:id/block',
            handler: apiBlockClub,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/club/:id/unblock',
            handler: apiUnblockClub,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/club_members',
            handler: apiGetClubMemberList,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/club_member/:id/set_admin',
            handler: apiSetClubAdmin,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/club_member/:id/unset_admin',
            handler: apiUnsetClubAdmin,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/club_member/:id/kick',
            handler: apiKickClubAdmin,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/club_statistics',
            handler: apiGetClubStatistics,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },

        // 系统设置
        {
            url: '/system_settings',
            handler: apiGetSystemSettings,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/system_settings',
            handler: apiUpdateSystemSettings,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 消息相关
        {
            url: '/messages',
            handler: apiGetMessages,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/message/:id',
            handler: apiUpdateMessage,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 系统统计
        {
            url: '/statistics',
            handler: apiGetStatistics,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },

        // 代理抽水比例设置
        {
            url: '/dealer_rates',
            handler: apiGetDealerRates,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/dealer_rate/:id',
            handler: apiUpdateDealerRate,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/dealer_rate/:id',
            handler: apiDeleteDealerRate,
            method: 'delete',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/dealer_rate',
            handler: apiCreateDealerRate,
            method: 'post',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 代理提现申请
        {
            url: '/dealer_withdraws',
            handler: apiGetDealerWithdraws,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/dealer_withdraw/:id/accept',
            handler: apiAcceptDealerWithdraw,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/dealer_withdraw/:id/reject',
            handler: apiRejectDealerWithdraw,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/dealer_withdraw/:id',
            handler: apiDeleteDealerWithdraw,
            method: 'delete',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 注册代理申请
        {
            url: '/dealer_requests',
            handler: apiGetDealerRequests,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/dealer_request/:id/accept',
            handler: apiAcceptDealerRequests,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/dealer_request/:id/reject',
            handler: apiRejectDealerRequests,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 商品相关
        {
            url: '/goods',
            handler: apiGetGoods,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/good/:id',
            handler: apiDeleteGood,
            method: 'delete',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/good/:id',
            handler: apiUpdateGood,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/good',
            handler: apiCreateGood,
            method: 'post',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 订单相关
        {
            url: '/order_logs',
            handler: apiGetOrderLogs,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/order_log/:id',
            handler: apiDeleteOrderLog,
            method: 'delete',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 反馈
        {
            url: '/feedbacks',
            handler: apiGetFeedbacks,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/feedback/:id/accept',
            handler: apiAcceptFeedback,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        },
        {
            url: '/feedback/:id',
            handler: apiDeleteFeedback,
            method: 'delete',
            privilege: CONST.PRIVILEGE.WRITE
        },

        // 比赛场相关
        {
            url: '/match_fields',
            handler: apiGetMatchFieldList,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/match_entry_forms',
            handler: apiGetMatchEntryFormList,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/match_entry_form/:id',
            handler: apiDeleteMatchEntryForm,
            method: 'delete',
            privilege:  CONST.PRIVILEGE.WRITE
        },
        {
            url: '/match_winners',
            handler: apiGetMatchWinnerList,
            method: 'get',
            privilege: CONST.PRIVILEGE.READ
        },
        {
            url: '/match_winner/:id',
            handler: apiDeleteMatchWinner,
            method: 'delete',
            privilege:  CONST.PRIVILEGE.WRITE
        },
        {
            url: '/match_winner/:id/award',
            handler: apiAwardMatchWinner,
            method: 'put',
            privilege: CONST.PRIVILEGE.WRITE
        }
    ]);
};