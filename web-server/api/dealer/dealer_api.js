/**
 * Created by leo on 12/8/2017.
 */

var Auth = module_manager.getModule(CONST.MODULE.AUTH);
var Event = module_manager.getModule(CONST.MODULE.EVENT);

/**
 * 代理注册(保留)
 *
 * @param api_session: 用户Session
 * @param auth_user: 用户信息
 * @param callback: 回调
 *
var apiDealerRegister = function(api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');
    var phone = api_session.get('phone');
    var wechat_id = api_session.get('wechat_id');
    var password = api_session.get('password');

    if (! user_id || ! phone || ! wechat_id || ! password) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    if (! UTIL.isValidPhone(phone)) {
        return callback(new Error(ERROR.INVALID_PHONE));
    }

    UserModel.lockAndGet(user_id, function(err, dealer) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! dealer) {
            UserModel.unlock(user_id);
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (dealer.is_dealer == UserModel.DEALER.YES) {
            UserModel.unlock(user_id);
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        // 代理申请状态, 申请时间
        dealer.is_dealer = UserModel.DEALER.WAITING;
        dealer.wechat_account = wechat_id;
        dealer.phone = phone;
        dealer.password = UTIL.encrypt(password);
        dealer.dealer_created_at = UTIL.getTimeDesc();

        UserModel.save(dealer, function(err, result) {
            UserModel.unlock(user_id);

            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            return callback(null);
        });
    });
};


/**
 * 代理token登录(保留)
 *
 * @param {APISession} api_session Session信息
 * @param {Object} auth_user 用户信息
 * @param {function} callback 回调
 *
var apiDealerTokenLogin = function(api_session, auth_user, callback) {
    auth_user.password = null;

    UserModel.getInfoWithChildCount(auth_user.id, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取代理系统公告(保留)
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 *
var apiGetDealerMessages = function (api_session, auth_user, callback) {
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    DealerMessageModel.getList([], [['created_at', 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 提交反馈(保留)
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 *
var apiSubmitFeedback = function (api_session, auth_user, callback) {
    var dealer_id = auth_user.id;
    var content = api_session.get('content');

    FeedbackModel.createDealerFeedback(dealer_id, content, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取指定用户信息(包含推荐用户数)(保留)
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 *
var apiGetUserInfo = function (api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');

    UserModel.getInfoWithChildCount(user_id, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取提现记录列表(保留)
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 *
var apiGetWithdrawLogs = function (api_session, auth_user, callback) {
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    DealerWithdrawModel.getList([['user_id', auth_user.id]], [['created_at', 'desc']], page_no, page_size, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取收入明细列表(保留)
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 *
var apiGetIncomeLogs = function (api_session, auth_user, callback) {
    var type = api_session.get('type');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];
    // 这里不要显示用户的充值记录
    conditions.push(['user_id', auth_user.id]);
    conditions.push(['type', 'like', '%' + type + '%']);
    conditions.push(['type', '!=', OrderLogModel.TYPE.USER_PURCHASE]);

    OrderLogModel.getList(conditions, [['created_at', 'desc']], page_no, page_size, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 申请提现(保留)
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 *
var apiRequestWithdraw = function (api_session, auth_user, callback) {
    var amount = api_session.get('amount');

    if (auth_user.money < amount) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    auth_user.money -= amount;

    UserModel.save(auth_user, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        // 做记录
        DealerWithdrawModel.createRequest(auth_user.id, amount, function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            return apiDealerTokenLogin(api_session, auth_user, callback);
        });
    });
};

/**
 * 获取子代理列表(保留)
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 *
var apiGetChildDealers = function (api_session, auth_user, callback) {
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    UserModel.getList([['r_code', auth_user.id], ['is_dealer', UserModel.DEALER.YES]], [['created_at', 'desc']], page_no, page_size, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! result.list || ! result.list.length) {
            return callback(null, result);
        }

        // result.list包含的是不包括推荐人数, 因此需要重新扫描
        var scanned_count = 0, wished_count = result.list.length;

        var doGetDealerInfo = function(index) {
            UserModel.getInfoWithChildCount(result.list[index].id, function(err, dealer) {
                scanned_count ++;
                if (! err) {
                    result.list[index] = dealer;
                }

                if (scanned_count == wished_count) {
                    return callback(null, result);
                }
            });
        };

        // 插入推荐人数
        for (var i = 0; i < result.list.length; i++) {
            doGetDealerInfo(i);
        }
    });
};

/**
 * 获取推荐用户列表(保留)
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 *
var apiGetChildUsers = function (api_session, auth_user, callback) {
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    UserModel.getList([['r_code', auth_user.id]], [['created_at', 'desc']], page_no, page_size, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};
*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  代理后台(2018.5.30) - 没有商城的简单版本
//
//  apiDealerLogin:                                 代理登录
//  apiGetDealerInfo:                               代理token登录
//  apiDealerChangePassword:                        修改代理登录密码
//
//  apiGetUserList:                                 获取用户列表
//  apiGetUser:                                     获取用户信息
//
//  apiGetClubList:                                 获取俱乐部列表
//  apiAwardUserGems:                               赠送用户房卡
//  apiAwardClubGems:                               赠送俱乐部房卡
//
//  apiGetDealerLogs:                               获取代理操作列表
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 代理登录
 *
 * @param api_session: 用户Session
 * @param auth_user: 用户信息
 * @param callback: 回调
 */
 var apiDealerLogin = function(api_session, auth_user, callback) {
    var id = api_session.get('id');
    var password = api_session.get('password');

    if (! id || ! password) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    //  首先进行加锁
    UserModel.lockAndGet(id, function (err, dealer) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }
        if (! dealer || dealer.is_dealer === UserModel.DEALER.NO) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.INVALID_USER));
        }

        if (dealer.password !== UTIL.encrypt(password)) {
            UserModel.unlock(id);
            return callback(new Error(ERROR.INVALID_PASSWORD));
        }

        //  赋予用户权限
        Auth.authorize(UserModel, dealer.id, function (err, token) {
            if (err) {
                UserModel.unlock(id);
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            dealer.dealer_last_login_time = UTIL.getTimeDesc();

            UserModel.save(dealer, function (err, dealer) {
                UserModel.unlock(id);
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                var result = {
                    token : token,
                    user_info: dealer
                };

                callback(null, result);
            });
        });
    });
};

 /**
 * 代理token登录
 *
 * @param {APISession} api_session Session信息
 * @param {Object} auth_user 用户信息
 * @param {function} callback 回调
 */
 var apiGetDealerInfo = function(api_session, auth_user, callback) {
     callback(null, auth_user);
};

/**
 * 修改代理登录密码
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiDealerChangePassword = function (api_session, auth_user, callback) {
    var old_password = api_session.get('old_password');
    var new_password = api_session.get('new_password');

    if (auth_user.password !== UTIL.encrypt(old_password)) {
        return callback(new Error(ERROR.INVALID_PASSWORD));
    }

    if (new_password == null) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 修改密码
    auth_user.password = UTIL.encrypt(new_password);
    UserModel.save(auth_user, function (err) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null);
    });
};

/**
 * 获取用户列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetUserList = function(api_session, auth_user, callback) {
    var keyword = api_session.get('keyword');
    var order_by = api_session.get('order_by');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    if (! keyword || keyword === '') {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    var conditions = [];
    conditions.push(['id', 'like', '%' + keyword + '%']);

    if (order_by == null) {
        order_by = 'created_at';
    }

    UserModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取用户信息
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetUser = function(api_session, auth_user, callback) {
    var user_id = api_session.get('id');

    UserModel.getByID(user_id, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 获取俱乐部列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 * @returns {*}
 */
var apiGetClubList = function(api_session, auth_user, callback) {
    var keyword = api_session.get('keyword');
    var order_by = api_session.get('order_by');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    if (! keyword || keyword === '') {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    var conditions = [];
    conditions.push(['id', 'like', '%' + keyword + '%']);

    if (order_by == null) {
        order_by = 'created_at';
    }

    ClubModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

/**
 * 赠送用户房卡
 *
 * @param api_session
 * @param auth_user
 * @param callback
 * @returns {*}
 */
var apiAwardUserGems = function(api_session, auth_user, callback) {
    var user_id = api_session.get('id');
    var gems = api_session.get('gems');

    user_id = parseInt(user_id);
    gems = parseInt(gems);

    if (isNaN(gems) || gems <= 0 || gems > auth_user.gems) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    if (user_id === auth_user.id) {
        // 不能给自己充房卡(没意义)
        return callback(new Error(ERROR.INVALID_PARAMS));
    } else {
        UserModel.lockAndGet(user_id, function (err, user) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!user) {
                UserModel.unlock(user_id);
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            // 赠送房卡
            user.gems += gems;

            UserModel.save(user, function (err, result) {
                UserModel.unlock(user_id);
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 扣取代理的房卡
                auth_user.gems -= gems;
                UserModel.save(auth_user, function (err, result) {
                    UserModel.unlock(auth_user.id);
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    // 推送给用户
                    Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                        user_id: user_id,
                        data: {
                            award: gems,
                            gems: user.gems,
                            reason: CONST.REASON.DEALER_SEND_GEMS
                        }
                    });

                    // 做记录
                    DealerLogModel.addLog(
                        auth_user.id,
                        DealerLogModel.TYPE.AWARD_USER_GEMS,
                        JSON.stringify({
                            user_id: user_id,
                            gems: gems
                        })
                    );

                    callback(null, result);
                });
            });
        });
    }
};

/**
 * 赠送俱乐部房卡
 *
 * @param api_session
 * @param auth_user
 * @param callback
 * @returns {*}
 */
var apiAwardClubGems = function(api_session, auth_user, callback) {
    var club_id = api_session.get('id');
    var gems = api_session.get('gems');

    gems = parseInt(gems);

    if (isNaN(gems) || gems <= 0 || gems > auth_user.gems) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        if (club.creator_id === auth_user.id) {
            // 自己的俱乐部
            auth_user.club_gems += gems;
            auth_user.gems -= gems;
            UserModel.save(auth_user, function (err, result) {
                UserModel.unlock(auth_user.id);
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 推送给俱乐部创始人
                Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                    user_id: auth_user.id,
                    data: {
                        award: gems,
                        club_gems: auth_user.club_gems,
                        reason: CONST.REASON.DEALER_SEND_CLUB_GEMS
                    }
                });

                // 做记录
                DealerLogModel.addLog(
                    auth_user.id,
                    DealerLogModel.TYPE.AWARD_CLUB_GEMS,
                    JSON.stringify({
                        club_id: club.id,
                        club_creator_id: club.creator_id,
                        gems: gems
                    })
                );

                callback(null, result);
            });
        } else {
            // 获取创始人信息
            UserModel.lockAndGet(club.creator_id, function (err, club_creator) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (!club_creator) {
                    UserModel.unlock(club.creator_id);
                    return callback(new Error(ERROR.INVALID_PARAMS));
                }

                // 赠送房卡
                club_creator.club_gems += gems;
                UserModel.save(club_creator, function (err, result) {
                    UserModel.unlock(club_creator.id);
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    // 扣取代理的房卡
                    auth_user.gems -= gems;
                    UserModel.save(auth_user, function (err, result) {
                        UserModel.unlock(auth_user.id);
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        // 推送给俱乐部创始人
                        Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                            user_id: club_creator.id,
                            data: {
                                award: gems,
                                club_gems: club_creator.club_gems,
                                reason: CONST.REASON.DEALER_SEND_CLUB_GEMS
                            }
                        });

                        // 做记录
                        DealerLogModel.addLog(
                            auth_user.id,
                            DealerLogModel.TYPE.AWARD_CLUB_GEMS,
                            JSON.stringify({
                                club_id: club.id,
                                club_creator_id: club.creator_id,
                                gems: gems
                            })
                        );

                        callback(null, result);
                    });
                });
            });
        }
    });
};

/**
 * 获取代理操作列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetDealerLogs = function(api_session, auth_user, callback) {
    var type = api_session.get('type');
    var order_by = api_session.get('order_by');
    var page_no = api_session.get('page_no');
    var page_size = api_session.get('page_size');

    var conditions = [];
    if (type && type !== '') {
        conditions.push(['type', type]);
    }
    conditions.push(['dealer_id', auth_user.id]);

    if (order_by == null) {
        order_by = 'created_at';
    }

    DealerLogModel.getList(conditions, [[order_by, 'desc']], page_no, page_size, function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

exports.init = function(main_app) {
    var prefix = '/api/v1/dealer';

    var API = module_manager.getModule(CONST.MODULE.API);
    API.register(prefix, UserModel, '', [
        /*
        {
            url: '/register',
            handler: apiDealerRegister,
            method: 'post',
            auth: false,
            lock: false
        },

        {
            url: '/messages',
            handler: apiGetDealerMessages,
            method: 'post'
        },
        {
            url: '/feedback',
            handler: apiSubmitFeedback,
            method: 'post'
        },
        {
            url: '/user_info',
            handler: apiGetUserInfo,
            method: 'post'
        },

        {
            url: '/withdraw_logs',
            handler: apiGetWithdrawLogs,
            method: 'post'
        },
        {
            url: '/income_logs',
            handler: apiGetIncomeLogs,
            method: 'post'
        },

        {
            url: '/request_withdraw',
            handler: apiRequestWithdraw,
            method: 'post'
        },

        {
            url: '/child_dealers',
            handler: apiGetChildDealers,
            method: 'post'
        },
        {
            url: '/child_users',
            handler: apiGetChildUsers,
            method: 'post'
        },
        */

        {
            url: '/login',
            handler: apiDealerLogin,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/info',
            handler: apiGetDealerInfo,
            method: 'post',
        },
        {
            url: '/change_password',
            handler: apiDealerChangePassword,
            method: 'post'
        },

        // 查找用户
        {
            url: '/users',
            handler: apiGetUserList,
            method: 'post'
        },
        {
            url: '/user/:id',
            handler: apiGetUser,
            method: 'post'
        },
        {
            url: '/clubs',
            handler: apiGetClubList,
            method: 'post'
        },
        {
            url: '/user/:id/send_gems',
            handler: apiAwardUserGems,
            method: 'post'
        },
        {
            url: '/club/:id/send_gems',
            handler: apiAwardClubGems,
            method: 'post'
        },
        {
            url: '/logs',
            handler: apiGetDealerLogs,
            method: 'post'
        },
    ]);
};