/**
 * Created by Administrator on 11/3/2017.
 */
var http = require('../../../shared/utils/http');
var NICKNAMES = require('../../../shared/config/nicknames');

var Auth = module_manager.getModule(CONST.MODULE.AUTH);
var Event = module_manager.getModule(CONST.MODULE.EVENT);
var Pay = module_manager.getModule(CONST.MODULE.PAY);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  系统设置
//
//  apiGetSystemSettings:                   获取系统设置
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
    SettingModel.getSettings(function(err, settings) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! settings) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        callback(null, settings);
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  登录相关
//
//  apiGuestLogin:                          游客登录
//  apiWechatLogin:                         微信登录
//
//  doLogin:                                登陆成功回调
//
//  get_access_token:                       获取微信Token
//  get_state_info:                         获取微信用户信息
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 游客登录
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGuestLogin = function(api_session, auth_user, callback) {
    var account = api_session.get('account');

    if (! account) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 获取用户信息
    UserModel.getByAccount(account, function(err, user) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! user) {
            // 没有账号，新建一个
            SettingModel.getSettings(function(err, settings) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (! settings) {
                    return callback(new Error(ERROR.MODEL_NOT_FOUND));
                }

                var gender = ["男", "女"];

                var user = {
                    account: account,
                    name: NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)],
                    gender: gender[Math.floor((Math.random() * 100)) % 2],
                    gems: settings.sign_in_gems,
                    match_gems: settings.sign_in_match_gems,
                    created_at: UTIL.getTimeDesc()
                };

                UserModel.createUser(user, function(err, user) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    doLogin(api_session, user, callback);
                });
            });
        } else {
            doLogin(api_session, user, callback);
        }
    });
};

/**
 * 微信登录
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiWechatLogin = function(api_session, auth_user, callback) {
    var code = api_session.get('code');

    if (! code) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    get_access_token(code, function(success, data) {
        if (success) {
            var access_token = data.access_token;
            var open_id = data.openid;

            get_state_info(access_token, open_id, function(success2, wechat_user) {
                if (success2) {
                    var open_id = wechat_user.openid;
                    var nickname = wechat_user.nickname;
                    var gender = wechat_user.sex;
                    var avatar = wechat_user.headimgurl;
                    var account = 'wx_' + open_id;

                    UserModel.getByAccount(account, function(err, user) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        if (! user) {
                            // 没有账号，新建一个
                            SettingModel.getSettings(function(err, settings) {
                                if (err) {
                                    return callback(new Error(ERROR.INVALID_OPERATION));
                                }

                                if (! settings) {
                                    return callback(new Error(ERROR.MODEL_NOT_FOUND));
                                }

                                var user = {
                                    account: account,
                                    name: nickname || '',
                                    gender: (gender === 1) ? ('男') : ('女'),
                                    avatar: avatar,
                                    gems: settings.sign_in_gems,
                                    is_dealer: UserModel.DEALER.NO,
                                    created_at: UTIL.getTimeDesc()
                                };

                                UserModel.createUser(user, function(err, result) {
                                    if (err) {
                                        return callback(new Error(ERROR.INVALID_OPERATION));
                                    }

                                    doLogin(api_session, result, callback);
                                });
                            });
                        } else {
                            // 更新最新信息
                            UserModel.save({
                                id: user.id,
                                account: account,
                                name: nickname || '',
                                gender: (gender === 1) ? ('男') : ('女'),
                                avatar: avatar
                            }, function(err, user) {
                                if (err) {
                                    return callback(new Error(ERROR.INVALID_OPERATION));
                                }

                                doLogin(api_session, user, callback);
                            });
                        }
                    });
                } else {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }
            });
        }
    });
};

/**
 * 登陆成功回调
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} user: 用户信息
 * @param {function} callback: 回调
 */
var doLogin = function (api_session, user, callback) {
    Auth.authorize(UserModel, user.id, function (err, token) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        var result = {
            token : token,
            user_id : user.id
        };

        callback(null, result);
    });
};

/**
 * 获取微信Token
 *
 * @param code
 * @param callback
 */
function get_access_token(code, callback) {
    var data = {
        appid: CONST.WX_APP_ID,
        secret: CONST.WX_APP_SECRET,
        code: code,
        grant_type: 'authorization_code'
    };

    http.get2('https://api.weixin.qq.com/sns/oauth2/access_token', data, callback, true);
}

/**
 * 获取微信用户信息
 *
 * @param access_token
 * @param openid
 * @param callback
 */
function get_state_info(access_token, openid, callback) {
    var data = {
        access_token : access_token,
        openid		 : openid
    };

    http.get2('https://api.weixin.qq.com/sns/userinfo', data, callback, true);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  用户信息相关
//
//  apiGetUserInfo:                         获取用户基本信息
//  apiSendSMSCode:                         获取手机验证码
//  apiSubmitIdentity:                      提交手机认证
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取用户基本信息
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetUserInfo = function(api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');

    UserModel.getByID(user_id, function(err, user) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! user) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        var data = UserModel.getBaseInfo(user);

        data.created_at = user.created_at;
        /*data.identity_no = user.identity_no;
        data.real_name = user.real_name;
        data.level = user.level;
        data.is_blocked = user.is_blocked;
        data.is_dealer = user.is_dealer;*/

        callback(null, data);
    });
};

/**
 * 获取手机验证码
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiSendSMSCode = function(api_session, auth_user, callback) {
    var phone = api_session.get('phone');

    var sendSMS = function() {
        SmsModel.sendSMS(phone, function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            return callback(null, true);
        });
    };

    SmsModel.getRecord(phone, null, function(err, record) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (record) {
            // 比较时间
            if (SmsModel.isExpiredRecord(record)) {
                SmsModel.delete(record.id, function(err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    // 发送新的验证码
                    sendSMS();
                });
            } else {
                // 已经有发送的记录, 直接返回
                return callback(null, true);
            }
        } else {
            // 发送验证码
            sendSMS();
        }
    });
};

/**
 * 提交手机认证
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiSubmitIdentity = function(api_session, auth_user, callback) {
    var code = api_session.get('code');
    var phone = api_session.get('phone');

   if (! UTIL.isValidPhone(phone)) {
       return callback(new Error(ERROR.INVALID_PHONE));
   }

    // 检查验证码记录
    SmsModel.getRecord(phone, code, function(err, record) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! record) {
            // 找不到记录
            return callback(new Error(ERROR.INVALID_SMS_CODE));
        }

        // 比较时间
        if (SmsModel.isExpiredRecord(record)) {
            // 验证码过期
            return callback(new Error(ERROR.SMS_CODE_EXPIRED));
        }

        SettingModel.getSettings(function(err, settings) {
            if (err || !settings) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 有效验证码, 绑定并赠送钻石
            var user = {
                id: auth_user.id,
                gems: auth_user.gems + settings.identity_award_gems,
                phone: phone
            };

            UserModel.save(user, function (err, result) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 绑定成功
                callback(null, {
                    phone: result.phone,
                    award: settings.identity_award_gems,
                    gems: result.gems
                });
            });
        });
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  消息, 反馈
//
//  apiGetMessage:                          获取消息（用户协议，系统通知，喇叭消息，房卡购买提醒）
//  apiSubmitFeedback:                      提交反馈
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取消息（用户协议，系统通知，喇叭消息，房卡购买提醒）
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetMessage = function(api_session, auth_user, callback) {
    var type = api_session.get('type');

    MessageModel.getByType(type, function(err, message) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! message) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        callback(null, message.content);
    });
};

/**
 * 提交反馈
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiSubmitFeedback = function (api_session, auth_user, callback) {
    var user_id = auth_user.id;
    var content = api_session.get('content');
    var contact = api_session.get('contact');

    FeedbackModel.createUserFeedback(user_id, content, contact, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, result);
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  战绩相关
//
//  apiGetHistoryRoomList:                  获取战绩
//  apiGetClubHistoryRoomList:              获取俱乐部战绩
//  apiGetRoom:                             获取指定房间信息
//  apiGetRoomRounds:                       获取战绩详情（所有回合信息）
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取战绩
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetHistoryRoomList = function(api_session, auth_user, callback) {
    RoomModel.getByFieldsEx([['status', CONST.ROOM_STATUS.FINISHED], ['players', 'like', '%' + auth_user.id + '%']], [['created_at', 'desc']], 0, 10, function (err, list) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, list);
    });
};

/**
 * 获取俱乐部战绩
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetClubHistoryRoomList = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var conditions = [];
    conditions.push(['status', CONST.ROOM_STATUS.FINISHED]);
    conditions.push(['club_id', club_id]);

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (!club) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        var count;
        if (club.creator_id === auth_user.id) {
            // 创建者
            count = 30;
        } else {
            // 成员, 也可以查看其他战绩
            count = 30;
            //conditions.push(['players', 'like', '%' + auth_user.id + '%']);
            //count = 10;
        }

        RoomModel.getByFieldsEx(conditions, [['created_at', 'desc']], 0, count, function (err, list) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            callback(null, list);
        });
    });
};

/**
 * 获取指定房间信息
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetRoom = function(api_session, auth_user, callback) {
    var room_id = api_session.get('room_id');

    RoomModel.getByID(room_id, function(err, room) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! room) {
            return callback(new Error(ERROR.INVALID_ROOM_ID));
        }

        callback(null, room);
    })
};

/**
 * 获取战绩详情（所有回合信息）
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiGetRoomRounds = function(api_session, auth_user, callback) {
    var room_id = api_session.get('room_id');

    RoundModel.getByFieldsEx([['room_id', room_id]], [['created_at', 'asc']], -1, 0, function (err, list) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, list);
    });
};

/**
 * 客服列表
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */

var apiGetClientsInfo = function(api_session, auth_user, callback) {
    ClientModel.getClients(function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }
        callback(null, result);
    });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  商品相关
//
//  apiGetGoods:                            获取商品列表
//  apiBuyGood:                             购买商品
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
 * 购买商品
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiBuyGood = function (api_session, auth_user, callback) {
    var good_id = api_session.get('good_id');
    var channel = api_session.get('channel');
    var native_pay = api_session.get('native_pay');

    GoodModel.getByID(good_id, function (err, good) {
        if (err || ! good) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        // 创建订单, 等待支付完成的通知
        OrderModel.createOrder(auth_user.id, good, channel, native_pay, api_session.get('ip'), function(err, result) {
            if (err) {
                return callback(err);
            }

            callback(null, result);
        });
    });
};

/**
 * 用户通过苹果内购购买商品(即IAP)
 * @param {APISession} api_session Session信息
 * @param {Object} auth_user 用户信息
 * @param {function} callback 回调
 */
var apiAppleVerify = function (api_session, auth_user, callback){
    var user_id = api_session.get('user_id');
    var receipt = api_session.get('receipt');

    /*
    try {
        receipt = JSON.parse(receipt);
        receipt = receipt.Payload;
    }
    catch (e) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }*/
    //console.log(receipt);

    //  连接苹果服务器，验证订单信息
    Pay.verifyIAP(receipt, function (err, in_app) {
        if (err) {
            console.log('IAP verify error:' + err.message);
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        var total_count = in_app.length;
        var done_count = 0;
        var onDone = function () {
            done_count++;
            if (done_count >= total_count)
                return callback(null, {})
        };

        //  进行购买
        var buyFunc = function (item) {
            var goods_id = item.product_id;
            var transaction_id = item.transaction_id;
            //var original_transaction_id = item.original_transaction_id;

            OrderModel.getOne([['trade_no', transaction_id], ['channel', CONST.PAY_CHANNEL.IAP]], function (err, old_charge) {
                //  如果已经处理过一次，忽略掉
                if (err || old_charge)
                    return onDone();

                //  获取商品信息
                GoodModel.getByID(goods_id, function (err, goods) {
                    if (err || !goods)
                        return onDone();

                    //  创建订单
                    OrderModel.createOrder(user_id, goods, CONST.PAY_CHANNEL.IAP, null, api_session.get("ip"), function (err, data) {
                        if (err)
                            return onDone();

                        var order_info = data.order_info;
                        //  直接完成支付
                        OrderModel.orderPayed(order_info.id, transaction_id, order_info.price, function () {
                            onDone();
                        });
                    });
                });
            });
        };

        for (var i = 0; i < in_app.length; i++) {
            buyFunc(in_app[i]);
        }
    });
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  分享（签到）
//
//  apiShareSuccess:                        分享成功
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 分享成功
 *
 * @param {APISession} api_session: Session信息
 * @param {Object} auth_user: 用户信息
 * @param {function} callback: 回调
 */
var apiShareSuccess = function (api_session, auth_user, callback) {
    var today = UTIL.getDateDesc();

    ShareModel.getByFields([['date', today], ['user_id', auth_user.id]], function (err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        var doAward = function(record) {
            record.share_count ++;
            ShareModel.save(record, function(err, result) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                SettingModel.getSettings(function(err, settings) {
                    if (err || !settings) {
                        return callback(null, null);
                    }

                    // 奖励用户
                    var award = UTIL.randomInt(1, settings.share_award + 1);
                    var user = {
                        id: auth_user.id,
                        match_gems: auth_user.match_gems + award
                    };
                    UserModel.save(user, function(err, result) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        callback(null, {
                            match_gems: result.match_gems,
                            award: award
                        });
                    });
                });
            })
        };

        if (result.length > 0) {
            var record = result[0];

            if (record.share_count >= 3) {
                // 已经分享3次了
                return callback(null, null);
            }

            doAward(record);
        } else {
            // 第一次分享了
            ShareModel.createRecord(auth_user.id, today, function (err, result) {
                if (err || !result) {
                    return callback(null, null);
                }

                doAward(result);
            });
        }
    });
};

/**
 * 签到
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiCheckIn = function(api_session, auth_user, callback) {
    var today = UTIL.getDateDesc();

    CheckInModel.getByFields([['date', today], ['user_id', auth_user.id]], function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (result.length > 0) {
            // 今天已经签过到
            return callback(null, null);
        }

        CheckInModel.createRecord(auth_user.id, today, function(err, result) {
            if (err || !result) {
                return callback(null, null);
            }

            SettingModel.getSettings(function (err, settings) {
                if (err || !settings) {
                    return callback(null, null);
                }

                // 奖励用户
                var user = {
                    id: auth_user.id,
                    match_gems: auth_user.match_gems + settings.check_in_award
                };
                UserModel.save(user, function (err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    callback(null, {
                        match_gems: result.match_gems,
                        award: settings.check_in_award
                    });
                });
            });
        });
    });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  俱乐部
//
//  apiGetClubs:                            获取用户的俱乐部列表
//  apiCreateClub:                          创建俱乐部
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 获取用户的俱乐部列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetClubs = function(api_session, auth_user, callback) {
    ClubModel.getClubsOfUser(auth_user.id, function(err, clubs) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        callback(null, clubs);
    });
};

/**
 * 创建俱乐部
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiCreateClub = function(api_session, auth_user, callback) {
    var name = api_session.get('name');
    var description = api_session.get('description');

    if (! name || ! description) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    // 1. 查封用户不能创建俱乐部
    if (auth_user.is_blocked) {
        return callback(new Error(ERROR.USER_BLOCKED));
    }

    SettingModel.getSettings(function(err, settings) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! settings) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        // 2. 房卡数量少于所需数量, 不能创建俱乐部
        if (settings.create_club_gems > auth_user.gems) {
            return callback(new Error(ERROR.NOT_ENOUGH_GEMS));
        }

        // 3. 俱乐部数量已经达到上限, 不能再创建
        ClubModel.getClubCountOfUser(auth_user.id, function(err, count) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (count >= settings.max_create_club_count) {
                return callback(new Error(ERROR.EXCEED_MAX_CREATE_CLUB_COUNT));
            }

            // 可以创建俱乐部
            var club = {
                creator_id: auth_user.id,
                creator_name: auth_user.name,
                name: name,
                description: description,
                contact: '',
                created_at: UTIL.getTimeDesc()
            };
            ClubModel.createClub(club, function(err, club) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 更新房卡, 俱乐部房卡
                var user = {
                    id: auth_user.id,
                    gems: auth_user.gems - settings.create_club_gems,
                    club_gems: auth_user.club_gems + settings.create_club_gems
                };
                UserModel.save(user, function (err, user) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    //  放到队列中，大厅服务器会读取以后推送给玩家
                    Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                        user_id: user.id,
                        data: {
                            cost: settings.create_club_gems,
                            gems: user.gems,
                            club_gems: user.club_gems,
                            reason: CONST.REASON.CREATE_CLUB_MINUS_GEMS
                        }
                    });

                    // 创建俱乐部成员记录
                    var club_member = {
                        club_id: club.id,
                        member_id: user.id,
                        member_name: user.name,
                        position: ClubMemberModel.POSITION.CREATOR,
                        status: ClubMemberModel.STATUS.APPROVED,
                        created_at: UTIL.getTimeDesc()
                    };
                    ClubMemberModel.create(club_member, function(err, result) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        // 要更新大厅俱乐部通道
                        Event.emit(CONST.EVENT.CLUB_MEMBER_ADDED, {
                            user_id: user.id,
                            club_id: club.id
                        });

                        // 创建成功, 返回俱乐部列表
                        apiGetClubs(api_session, auth_user, callback);
                    });
                });
            });
        });
    });
};

/**
 * 加入俱乐部
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiJoinClub = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');

    if (! club_id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club) {
            return callback(new Error(ERROR.INVALID_CLUB_ID));
        }

        ClubMemberModel.getByFields([['club_id', club_id], ['member_id', auth_user.id]], function(err, club_members) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            var club_member;
            if (club_members.length > 0) {
                club_member = club_members[0];
                if (club_member.status === ClubMemberModel.STATUS.APPROVED) {
                    return callback(new Error(ERROR.ALREADY_CLUB_MEMBER));
                } else {
                    // 更新
                    club_member.status = ClubMemberModel.STATUS.PENDING;
                    club_member.created_at = UTIL.getTimeDesc();

                    ClubMemberModel.save(club_member, function(err, club_member) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        return callback(null);
                    });
                }
            } else {
                // 可以加入
                club_member = {
                    club_id: club_id,
                    member_id: auth_user.id,
                    member_name: auth_user.name,
                    position: ClubMemberModel.POSITION.MEMBER,
                    status: ClubMemberModel.STATUS.PENDING,
                    created_at: UTIL.getTimeDesc()
                };
                ClubMemberModel.create(club_member, function (err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    callback(null);
                });
            }
        });
    });
};

/**
 * 获取俱乐部信息
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetClubInfo = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }
        ClubMemberModel.getMemberIDsOfClub(club_id, ClubMemberModel.STATUS.APPROVED, function(err, member_ids) {
            if(err) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }
            club.member_count = member_ids.length;
            RoomModel.getPlayingClubRoomCount(club_id, function(err, playingroomCount) {
                club.playing_room_count = playingroomCount;
                RoomModel.getWaitingClubRoomCount(club_id, function(err, playingroomCount) {
                    club.waiting_room_count = playingroomCount;
                    return callback(null, club);
                });
            });
        });
    });
};

/**
 * 更新俱乐部信息
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiUpdateClubInfo = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var name = api_session.get('name');
    var description = api_session.get('description');
    var contact = api_session.get('contact');

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        if (club.creator_id !== auth_user.id) {
            return callback(new Error(ERROR.NOT_CLUB_CREATOR));
        }

        if (name) club.name = name;
        if (description) club.description = description;
        if (contact) club.contact = contact;

        ClubModel.save(club, function(err, club) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 通过大厅, 推送给创建者
            Event.emit(CONST.EVENT.CLUB_INFO_CHANGED_TO_CREATOR, {
                user_id: club.creator_id,
                data: {
                    club_id: club.id,
                    name: club.name,
                    contact: club.contact,
                    description: club.description,
                    reason: CONST.REASON.CLUB_CREATOR_UPDATED_INFO
                }
            });

            return callback(null, club);
        });
    })
};

/**
 * 获取俱乐部房间选项列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetClubRoomSettings = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    ClubRoomSettingModel.getByFields([['club_id', club_id]], function(err, club_room_settings) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        return callback(null, club_room_settings);
    });
};

/**
 * 获取俱乐部创建的房间列表
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetClubRooms = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var room_type = api_session.get('room_type');
    var status;

    if(room_type === "0") //查找未开始的房间
        status = "waiting";
    else if(room_type === "1") //已开始的房间
        status = "playing";
    else if(room_type === "2") //已结束的房间
        status = "finished";

    RoomModel.getByFields([['club_id', club_id], ['status', status], ['club_room_setting_id', 0]], function(err, club_rooms) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }
        return callback(null, club_rooms);
    });
};

/**
 * 添加俱乐部创建选项
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiAddClubRoomSetting = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var game_id = api_session.get('game_id');
    var settings = api_session.get('settings');
    var count = api_session.get('count');

    count = parseInt(count);

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        ClubMemberModel.getMembersOfClub(club_id, ClubMemberModel.STATUS.APPROVED, auth_user.id, function(err, club_members) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!club_members || club_members.length === 0) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            var club_member = club_members[0];

            if (club_member.position === ClubMemberModel.POSITION.MEMBER) {
                return callback(new Error(ERROR.NOT_CLUB_ADMIN));
            }

            var club_room_setting = {
                club_id: club_id,
                game_id: game_id,
                settings: settings,
                created_at: UTIL.getTimeDesc()
            };
            ClubRoomSettingModel.createBatch(club_room_setting, count, function (err, result) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 广播通知给所有成员
                Event.emit(CONST.EVENT.CLUB_ROOM_SETTING_CREATED_TO_MEMBERS, {
                    club_id: club_id,
                    data: {
                        club_room_settings: result
                    }
                });

                return callback(null, result);
            });
        });
    });
};

/**
 * 删除俱乐部创建选项
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiDeleteClubRoomSetting = function(api_session, auth_user, callback) {
    var club_room_setting_id = api_session.get('club_room_setting_id');

    ClubRoomSettingModel.getByID(club_room_setting_id, function(err, club_room_setting) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club_room_setting) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        ClubModel.getByID(club_room_setting.club_id, function(err, club) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (! club) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            ClubMemberModel.getMembersOfClub(club.id, ClubMemberModel.STATUS.APPROVED, auth_user.id, function(err, club_members) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (!club_members || club_members.length === 0) {
                    return callback(new Error(ERROR.INVALID_PARAMS));
                }

                var club_member = club_members[0];

                if (club_member.position === ClubMemberModel.POSITION.MEMBER) {
                    return callback(new Error(ERROR.NOT_CLUB_ADMIN));
                }

                ClubRoomSettingModel.delete(club_room_setting_id, function (err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    // 广播通知给所有成员
                    Event.emit(CONST.EVENT.CLUB_ROOM_SETTING_DELETED_TO_MEMBERS, {
                        club_id: club_room_setting.club_id,
                        data: {
                            club_room_setting_id: club_room_setting.id
                        }
                    });

                    return callback(null, result);
                });
            });
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
var apiGetApprovedClubMembers = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');

    ClubMemberModel.getMembersOfClub(club_id, ClubMemberModel.STATUS.APPROVED, null, function(err, club_members) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        return callback(null, club_members);
    });
};

/**
 * 获取待审核俱乐部成员邀请列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetPendingClubMembers = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');

    ClubMemberModel.getMembersOfClub(club_id, ClubMemberModel.STATUS.PENDING, null, function(err, club_members) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        return callback(null, club_members);
    });
};

/**
 * 获取俱乐部管理员列表
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetAdminClubMembers = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');

    ClubMemberModel.getAdminsOfClub(club_id, null, function(err, club_admins) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        return callback(null, club_admins);
    });
};

/**
 * 接受俱乐部成员邀请
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiAcceptClubMember = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var member_id = api_session.get('id');

    if (auth_user.id === member_id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        ClubMemberModel.getMembersOfClub(club.id, ClubMemberModel.STATUS.APPROVED, auth_user.id, function(err, club_members) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!club_members || club_members.length === 0) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            var club_member = club_members[0];

            if (club_member.position === ClubMemberModel.POSITION.MEMBER) {
                return callback(new Error(ERROR.NOT_CLUB_ADMIN));
            }

            ClubMemberModel.getByFields([['club_id', club_id], ['member_id', member_id]], function (err, club_members) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (club_members.length === 0) {
                    return callback(new Error(ERROR.MODEL_NOT_FOUND));
                }

                var club_member = club_members[0];
                club_member.status = ClubMemberModel.STATUS.APPROVED;

                ClubMemberModel.save(club_member, function (err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    // 要更新大厅俱乐部通道
                    Event.emit(CONST.EVENT.CLUB_MEMBER_ADDED, {
                        user_id: member_id,
                        club_id: club.id
                    });

                    return callback(null, result);
                });
            });
        });
    });
};

/**
 * 拒绝俱乐部成员邀请
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiRejectClubMember = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var member_id = api_session.get('id');

    if (auth_user.id === member_id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        ClubMemberModel.getMembersOfClub(club.id, ClubMemberModel.STATUS.APPROVED, auth_user.id, function(err, club_members) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!club_members || club_members.length === 0) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            var club_member = club_members[0];

            if (club_member.position === ClubMemberModel.POSITION.MEMBER) {
                return callback(new Error(ERROR.NOT_CLUB_ADMIN));
            }

            ClubMemberModel.getByFields([['club_id', club_id], ['member_id', member_id]], function(err, club_members) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (club_members.length === 0) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            var club_member = club_members[0];
            ClubMemberModel.delete(club_member.id, function(err, result) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 删除成功
                return callback(null, true);
            });
        });
        });
    });
};

/**
 * 删除（踢出）俱乐部成员
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiDeleteClubMember = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var member_id = api_session.get('id');

    if (auth_user.id === member_id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        ClubMemberModel.getMembersOfClub(club_id, ClubMemberModel.STATUS.APPROVED, auth_user.id, function(err, club_members) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!club_members || club_members.length === 0) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            var club_member = club_members[0];

            if (club_member.position === ClubMemberModel.POSITION.MEMBER) {
                return callback(new Error(ERROR.NOT_CLUB_ADMIN));
            }

            ClubMemberModel.getByFields([['club_id', club_id], ['member_id', member_id]], function (err, club_members) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (club_members.length === 0) {
                    return callback(new Error(ERROR.MODEL_NOT_FOUND));
                }

                var club_member = club_members[0];
                ClubMemberModel.delete(club_member.id, function (err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    // 推送给被删除成员
                    Event.emit(CONST.EVENT.CLUB_INFO_CHANGED_TO_MEMBER, {
                        user_id: member_id,
                        data: {
                            club_id: club.id,
                            club_name: club.name,
                            reason: CONST.REASON.CLUB_MEMBER_FIRED
                        }
                    });

                    // 要从大厅俱乐部通道删除
                    Event.emit(CONST.EVENT.CLUB_MEMBER_DELETED, {
                        user_id: member_id,
                        club_id: club.id
                    });

                    // 删除成功
                    return callback(null, true);
                });
            });
        });
    });
};

/**
 * 查找俱乐部成员
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiSearchClubMember = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var keyword = api_session.get('keyword');

    ClubMemberModel.getMembersOfClub(club_id, null, keyword, function(err, club_members) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (club_members.length === 0) {
            return callback(null, null);
        }

        return callback(null, club_members[0]);
    });
};

/**
 * 查找用户
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiSearchUser = function(api_session, auth_user, callback) {
    var keyword = api_session.get('keyword');

    UserModel.getByID(keyword, function(err, user) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        return callback(null, user);
    })
};

/**
 * 邀请俱乐部成员
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiInviteMember = function(api_session, auth_user, callback) {
    var user_id = api_session.get('user_id');
    var club_id = api_session.get('club_id');

    UserModel.getByID(user_id, function(err, user) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! user) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        ClubMemberModel.getByFields([['club_id', club_id], ['member_id', user.id]], function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (result.length > 0) {
                return callback(new Error(ERROR.ALREADY_CLUB_MEMBER));
            }

            ClubModel.getByID(club_id, function(err, club) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (!club || club.creator_id !== auth_user.id) {
                    return callback(new Error(ERROR.INVALID_PARAMS));
                }

                // 创建俱乐部成员记录
                var club_member = {
                    club_id: club_id,
                    member_id: user.id,
                    member_name: user.name,
                    position: ClubMemberModel.POSITION.MEMBER,
                    status: ClubMemberModel.STATUS.APPROVED,
                    created_at: UTIL.getTimeDesc()
                };
                ClubMemberModel.create(club_member, function (err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    // 推送给被邀请成员
                    Event.emit(CONST.EVENT.CLUB_INFO_CHANGED_TO_MEMBER, {
                        user_id: user.id,
                        data: {
                            club_id: club.id,
                            club_name: club.name,
                            reason: CONST.REASON.CLUB_MEMBER_INVITED
                        }
                    });

                    // 要更新大厅俱乐部通道
                    Event.emit(CONST.EVENT.CLUB_MEMBER_ADDED, {
                        user_id: user.id,
                        club_id: club.id
                    });

                    return callback(null, result);
                });
            });
        });
    })
};

/**
 * 退出俱乐部
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiExitClub = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var user_id = auth_user.id;

    ClubMemberModel.getByFields([['club_id', club_id], ['member_id', user_id], ['status', ClubMemberModel.STATUS.APPROVED]], function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! result.length) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        var club_member_id = result[0].id;
        ClubMemberModel.delete(club_member_id, function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 要从大厅俱乐部通道删除
            Event.emit(CONST.EVENT.CLUB_MEMBER_DELETED, {
                user_id: user_id,
                club_id: club_id
            });

            return callback(null);
        });
    });
};

/**
 * 删除俱乐部
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiDeleteClub = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var user_id = auth_user.id;

    ClubMemberModel.deleteByFields([['club_id', club_id]], false, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }
        ClubModel.delete(club_id, function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 要从大厅俱乐部通道删除
            /*Event.emit(CONST.EVENT.CLUB_MEMBER_DELETED, {
                user_id: user_id,
                club_id: club_id
            });*/

            return callback(null);
        });
    });

    ClubMemberModel.getByFields([['club_id', club_id], ['member_id', user_id], ['status', ClubMemberModel.STATUS.APPROVED]], function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! result.length) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        var club_member_id = result[0].id;
        ClubMemberModel.delete(club_member_id, function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 要从大厅俱乐部通道删除
            Event.emit(CONST.EVENT.CLUB_MEMBER_DELETED, {
                user_id: user_id,
                club_id: club_id
            });

            return callback(null);
        });
    });
};

/**
 * 充俱乐部房卡
 *
 * @param api_session
 * @param auth_user
 * @param callback
 * @returns {*}
 */
var apiChargeClubGems = function(api_session, auth_user, callback) {
    var amount = parseInt(api_session.get('amount'));

    if (auth_user.gems < amount) {
        return callback(new Error(ERROR.NOT_ENOUGH_GEMS));
    }

    UserModel.save({
        id: auth_user.id,
        gems: auth_user.gems - amount,
        club_gems: auth_user.club_gems + amount
    }, function(err, user) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        // 广播通知 - 通知用户房卡
        Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
            user_id: auth_user.id,
            data: {
                cost: amount,
                gems: user.gems,
                club_gems: user.club_gems,
                reason: CONST.REASON.USER_CHARGE_CLUB_GEMS
            }
        });

        // 广播通知 - 通知俱乐部房卡
        Event.emit(CONST.EVENT.CLUB_INFO_CHANGED_TO_CREATOR, {
            user_id: user.id,
            data: {
                award: amount,
                club_gems: user.club_gems,
                reason: CONST.REASON.USER_CHARGE_CLUB_GEMS
            }
        });

        callback(null, null);
    });
};

/**
 * 转让创始人位置
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiTransferCreatorPosition = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var member_id = api_session.get('member_id');

    if (member_id === auth_user.id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club || club.creator_id !== auth_user.id) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        ClubMemberModel.getMembersOfClub(club_id, ClubMemberModel.STATUS.APPROVED, auth_user.id, function(err, club_members) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!club_members || club_members.length === 0) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            var club_creator = club_members[0];

            ClubMemberModel.getMembersOfClub(club_id, ClubMemberModel.STATUS.APPROVED, member_id, function (err, club_members) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                if (!club_members || club_members.length === 0) {
                    return callback(new Error(ERROR.INVALID_PARAMS));
                }

                var club_member = club_members[0];

                // 检查成员的房卡
                UserModel.getByID(club_member.member_id, function(err, member_user) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    if (! member_user) {
                        return callback(new Error(ERROR.INVALID_PARAMS));
                    }

                    SettingModel.getSettings(function (err, settings) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        if (! settings) {
                            return callback(new Error(ERROR.MODEL_NOT_FOUND));
                        }

                        // 房卡数量少于所需数量, 不能转让
                        if (settings.create_club_gems > member_user.gems) {
                            return callback(new Error(ERROR.NOT_ENOUGH_GEMS));
                        }

                        // 1. 更新俱乐部的创始人信息
                        club.creator_id = member_user.id;
                        club.creator_name = member_user.name;

                        ClubModel.save(club, function(err, club) {
                            if (err) {
                                return callback(new Error(ERROR.INVALID_OPERATION));
                            }

                            // 2. 更新老创始人的position
                            club_creator.position = ClubMemberModel.POSITION.MEMBER;

                            ClubMemberModel.save(club_creator, function (err, result) {
                                if (err) {
                                    return callback(new Error(ERROR.INVALID_OPERATION));
                                }

                                // 3. 更新成员的position
                                club_member.position = ClubMemberModel.POSITION.CREATOR;

                                ClubMemberModel.save(club_member, function (err, result) {
                                    if (err) {
                                        return callback(new Error(ERROR.INVALID_OPERATION));
                                    }

                                    // 推送给老创始人
                                    club.position = ClubMemberModel.POSITION.MEMBER;
                                    Event.emit(CONST.EVENT.CLUB_CREATOR_CHANGED_TO_CREATOR, {
                                        user_id: club_creator.member_id,
                                        data: {
                                            club: club,
                                            reason: CONST.REASON.CLUB_CREATOR_TRANSFERED
                                        }
                                    });

                                    // 推送给新创始人
                                    club.position = ClubMemberModel.POSITION.CREATOR;
                                    Event.emit(CONST.EVENT.CLUB_CREATOR_CHANGED_TO_CREATOR, {
                                        user_id: club_member.member_id,
                                        data: {
                                            club: club,
                                            reason: CONST.REASON.CLUB_CREATOR_AWARDED
                                        }
                                    });

                                    callback(null, null);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

/**
 * 设置俱乐部管理员
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiAwardAdminPosition = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var member_id = api_session.get('member_id');

    if (member_id === auth_user.id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (!club || club.creator_id !== auth_user.id) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        SettingModel.getSettings(function(err, settings) {                                                             //   获取系统设置
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!settings) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            ClubMemberModel.getAdminsOfClub(club_id, null, function (err, club_admins) {                              //   获取亲友圈管理员列表
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                var club_admin_count = club_admins.length;
                if (settings.max_club_admin_count <= club_admin_count) {                                                //   检查管理员数量
                    return callback(new Error(ERROR.EXCEED_MAX_CLUB_ADMIN_COUNT));
                }

                ClubMemberModel.getMembersOfClub(club_id, ClubMemberModel.STATUS.APPROVED, member_id, function (err, club_members) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    if (!club_members || club_members.length === 0) {
                        return callback(new Error(ERROR.INVALID_PARAMS));
                    }

                    var club_member = club_members[0];

                    // 更新成员的position
                    club_member.position = ClubMemberModel.POSITION.ADMIN;

                    ClubMemberModel.save(club_member, function (err, result) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        // 插入position
                        club.position = ClubMemberModel.POSITION.ADMIN;

                        // 推送俱乐部管理员
                        Event.emit(CONST.EVENT.CLUB_ADMIN_CHANGED_TO_MEMBER, {
                            user_id: member_id,
                            data: {
                                club: club,
                                reason: CONST.REASON.CLUB_ADMIN_AWARDED
                            }
                        });

                        callback(null, null);
                    });
                });
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
var apiRevokeAdminPosition = function(api_session, auth_user, callback) {
    var club_id = api_session.get('club_id');
    var member_id = api_session.get('member_id');

    if (member_id === auth_user.id) {
        return callback(new Error(ERROR.INVALID_PARAMS));
    }

    ClubModel.getByID(club_id, function(err, club) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (!club || club.creator_id !== auth_user.id) {
            return callback(new Error(ERROR.INVALID_PARAMS));
        }

        ClubMemberModel.getMembersOfClub(club_id, ClubMemberModel.STATUS.APPROVED, member_id, function (err, club_members) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!club_members || club_members.length === 0) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            var club_member = club_members[0];

            // 更新成员的position
            club_member.position = ClubMemberModel.POSITION.MEMBER;

            ClubMemberModel.save(club_member, function(err, result) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 插入position
                club.position = ClubMemberModel.POSITION.MEMBER;

                // 推送俱乐部成员
                Event.emit(CONST.EVENT.CLUB_ADMIN_CHANGED_TO_MEMBER, {
                    user_id: member_id,
                    data: {
                        club: club,
                        reason: CONST.REASON.CLUB_ADMIN_REVOKED
                    }
                });

                callback(null, null);
            });
        });
    });
};

/**
 * 获取指定俱乐部的房卡
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetClubGems = function(api_session, auth_user, callback) {
    // var club_id = api_session.get('club_id');
    var creator_id = api_session.get('creator_id');

    UserModel.getByID(creator_id, function(err, club_creator) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (! club_creator) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        return callback(null, club_creator.club_gems);
    });
};

/**
 * 比赛场报名
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiSignUpMatchField = function(api_session, auth_user, callback) {
    // 1. 是否已经在玩游戏
    if  (auth_user.room_id !== '' && auth_user.room_id > 0) {
        return callback(new Error(ERROR.ALREADY_IN_ROOM));
    }

    var type = api_session.get('type');

    // 2. 是否已经报过名
    MatchEntryFormModel.getByFields([['user_id', auth_user.id], ['type', type], ['status', '=', MatchEntryFormModel.STATUS.WAITING]], function(err, match_entry_form) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (match_entry_form.length > 0) {
            return callback(new Error(ERROR.ALREADY_SIGNED_TO_MATCH_FIELD));
        }

        // 获取当前时间秒
        var now_in_second = Math.floor(Date.now() / 1000);
        // 获取下一期开赛时间
        var next_hour_in_second = Math.ceil(now_in_second / 3600) * 3600;

        SettingModel.getSettings(function(err, settings) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (!settings) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            var enter_fee;
            var hour = new Date().getHours();

            if (type === CONST.MATCH_TYPE.DAY) {
                // -- 日赛 --
                enter_fee = settings.enter_day_match_field_gems;

                // 开赛时间是否有效
                if (hour >= settings.day_match_end_at_hour) {
                    return callback(new Error(ERROR.INVALID_PARAMS));
                }

                // 开赛时间为上午10点
                if (hour < settings.day_match_begin_at_hour) {
                    next_hour_in_second += 3600 * (settings.day_match_begin_at_hour - 1 - hour);
                }
            } else if (type === CONST.MATCH_TYPE.WEEK) {
                // -- 周赛 --
                enter_fee = settings.enter_week_match_field_gems;

                var day = new Date().getDay();
                var left_day_count = (settings.week_match_start_day + 7 - day) % 7;
                if (hour < settings.week_match_start_at_hour) {
                    next_hour_in_second += 3600 * (settings.week_match_start_at_hour - 1 - hour);
                    next_hour_in_second += 3600 * 24 * left_day_count;
                } else if (hour >= settings.week_match_start_at_hour) {
                    next_hour_in_second += 3600 * (settings.week_match_start_at_hour + 24 - 1 - hour);
                    next_hour_in_second += 3600 * 24 * ((left_day_count + 7 - 1) % 7);
                }
            } else {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            // 比赛卡够不够
            if (auth_user.match_gems < enter_fee) {
                return callback(new Error(ERROR.NOT_ENOUGH_MATCH_GEMS));
            }

            // 扣取比赛卡
            UserModel.save({
                id: auth_user.id,
                match_gems: auth_user.match_gems - enter_fee
            }, function (err, result) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                    user_id: auth_user.id,
                    data: {
                        cost: enter_fee,
                        match_gems: result.match_gems,
                        reason: CONST.REASON.SIGN_TO_MATCH_FIELD
                    }
                });

                MatchEntryFormModel.create({
                    type: type,
                    user_id: auth_user.id,
                    match_start_time: UTIL.getTimeDesc(next_hour_in_second * 1000),
                    match_start_timestamp: next_hour_in_second,
                    created_at: UTIL.getTimeDesc()
                }, function (err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    // 获取报名人数
                    MatchEntryFormModel.getCountEx([['type', type], ['match_start_timestamp', next_hour_in_second]], function(err, count) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        return callback(null, {
                            type: type,
                            player_count: count
                        });
                    });
                });
            });
        });
    });
};

/**
 * 取消报名比赛场
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiCancelSignUpMatchField = function(api_session, auth_user, callback) {
    var type = api_session.get('type');

    // 获取当前时间秒
    var now_in_second = Math.floor(Date.now() / 1000);
    // 获取下一期开赛时间
    var next_hour_in_second = Math.ceil(now_in_second / 3600) * 3600;

    SettingModel.getSettings(function(err, settings) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (!settings) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        var hour = new Date().getHours();
        var enter_fee;

        if (type === CONST.MATCH_TYPE.DAY) {
            // -- 日赛 --
            enter_fee = settings.enter_day_match_field_gems;

            // 开赛时间是否有效
            if (hour >= settings.day_match_end_at_hour) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            // 开赛时间为上午10点
            if (hour < settings.day_match_begin_at_hour) {
                next_hour_in_second += 3600 * (settings.day_match_begin_at_hour - 1 - hour);
            }
        } else if (type === CONST.MATCH_TYPE.WEEK) {
            // -- 周赛 --
            enter_fee = settings.enter_week_match_field_gems;

            var day = new Date().getDay();
            var left_day_count = (settings.week_match_start_day + 7 - day) % 7;
            if (hour < settings.week_match_start_at_hour) {
                next_hour_in_second += 3600 * (settings.week_match_start_at_hour - 1 - hour);
                next_hour_in_second += 3600 * 24 * left_day_count;
            } else if (hour >= settings.week_match_start_at_hour) {
                next_hour_in_second += 3600 * (settings.week_match_start_at_hour + 24 - 1 - hour);
                next_hour_in_second += 3600 * 24 * ((left_day_count + 7 - 1) % 7);
            }
        }

        MatchEntryFormModel.getByFields([['user_id', auth_user.id], ['type', type], ['match_start_timestamp', next_hour_in_second]], function(err, match_entry_form) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            if (match_entry_form.length !== 1) {
                return callback(new Error(ERROR.INVALID_PARAMS));
            }

            // 删除报名记录
            MatchEntryFormModel.delete(match_entry_form[0].id, function (err, result) {
                if (err) {
                    return callback(new Error(ERROR.INVALID_OPERATION));
                }

                // 退回比赛卡
                UserModel.save({
                    id: auth_user.id,
                    match_gems: auth_user.match_gems + enter_fee
                }, function(err, result) {
                    if (err) {
                        return callback(new Error(ERROR.INVALID_OPERATION));
                    }

                    Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                        user_id: auth_user.id,
                        data: {
                            award: enter_fee,
                            match_gems: result.match_gems,
                            reason: CONST.REASON.ROLLBACK_MATCH_FIELD_FEE
                        }
                    });

                    // 获取报名人数
                    MatchEntryFormModel.getCountEx([['type', type], ['match_start_timestamp', next_hour_in_second]], function(err, count) {
                        if (err) {
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        return callback(null, {
                            player_count: count
                        });
                    });
                });
            });
        });
    });
};

/**
 * 获取下一场比赛场信息
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetNextMatchFieldInfo = function(api_session, auth_user, callback) {
    var type = api_session.get('type');

    // 获取当前时间秒
    var now_in_second = Math.floor(Date.now() / 1000);
    // 获取下一期开赛时间
    var next_hour_in_second = Math.ceil(now_in_second / 3600) * 3600;
    var hour = new Date().getHours();

    SettingModel.getSettings(function(err, settings) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        if (!settings) {
            return callback(new Error(ERROR.MODEL_NOT_FOUND));
        }

        var next_match_hour;
        if (type === CONST.MATCH_TYPE.DAY) {
            // 日赛
            if (hour < settings.day_match_begin_at_hour) {
                next_match_hour = settings.day_match_begin_at_hour;
                next_hour_in_second += 3600 * (settings.day_match_begin_at_hour - 1 - hour);
            } else if ((hour + 1) < settings.day_match_end_at_hour) {
                next_match_hour = hour + 1;
            } else {
                // 今天比赛已完毕
                return callback(new Error(ERROR.NO_AVAILABLE_MATCH));
            }
        } else if (type === CONST.MATCH_TYPE.WEEK) {
            // 周赛
            var day = new Date().getDay();
            var left_day_count = (settings.week_match_start_day + 7 - day) % 7;
            if (hour < settings.week_match_start_at_hour) {
                next_hour_in_second += 3600 * (settings.week_match_start_at_hour - 1 - hour);
                next_hour_in_second += 3600 * 24 * left_day_count;
            } else if (hour >= settings.week_match_start_at_hour) {
                next_hour_in_second += 3600 * (settings.week_match_start_at_hour + 24 - 1 - hour);
                next_hour_in_second += 3600 * 24 * ((left_day_count + 7 - 1) % 7);
            }
        }

        MatchEntryFormModel.getByFields([['match_start_timestamp', next_hour_in_second], ['type', type]], function(err, result) {
            if (err) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            // 是否已经报过名
            var has_signed = false;
            for (var i = 0; i < result.length; i++) {
                if (result[i].user_id === auth_user.id && result[i].status === MatchEntryFormModel.STATUS.WAITING) {
                    has_signed = true;
                    break;
                }
            }

            if (type === CONST.MATCH_TYPE.DAY) {
                return callback(null, {
                    type: type,
                    start_time: next_match_hour,
                    player_count: result.length,
                    has_signed: has_signed
                });
            } else if (type === CONST.MATCH_TYPE.WEEK) {
                return callback(null, {
                    type: type,
                    start_time: UTIL.getTimeDesc(next_hour_in_second * 1000),
                    player_count: result.length,
                    has_signed: has_signed
                });
            }
        });
    });
};

/**
 * 获取比赛场获奖者信息
 *
 * @param api_session
 * @param auth_user
 * @param callback
 */
var apiGetMatchWinnerInfo = function(api_session, auth_user, callback) {
    // 获取最新10条
    MatchWinnerModel.getList([], [['created_at', 'desc']], 1, 30, function(err, result) {
        if (err) {
            return callback(new Error(ERROR.INVALID_OPERATION));
        }

        return callback(null, result.list);
    });
};

exports.init = function(main_app) {
    var prefix = '/api/v1/game';

    var API = module_manager.getModule(CONST.MODULE.API);
    API.register(prefix, UserModel, '', [
        // 设置相关
        {
            url: '/server_info',
            handler: apiGetSystemSettings,
            method: 'post',
            auth: false,
            lock: false
        },

        // 用户相关
        {
            url: '/guest',
            handler: apiGuestLogin,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/wechat_login',
            handler: apiWechatLogin,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/user_info',
            handler: apiGetUserInfo,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/send_sms',
            handler: apiSendSMSCode,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/submit_identity',
            handler: apiSubmitIdentity,
            method: 'post'
        },

        // 消息相关
        {
            url: '/message',
            handler: apiGetMessage,
            method: 'post',
            auth: false,
            lock: false
        },

        // 反馈相关
        {
            url: '/feedback',
            handler: apiSubmitFeedback,
            method: 'post',
            lock: false
        },

        // 战绩相关
        {
            url: '/history_rooms',
            handler: apiGetHistoryRoomList,
            method: 'post',
            lock: false
        },
        {
            url: '/club_history_rooms',
            handler: apiGetClubHistoryRoomList,
            method: 'post',
            lock: false
        },
        {
            url: '/room',
            handler: apiGetRoom,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/rounds',
            handler: apiGetRoomRounds,
            method: 'post',
            auth: false,
            lock: false
        },

        //  商品相关
        {
            url: '/goods',
            handler: apiGetGoods,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/buy',
            handler: apiBuyGood,
            method: 'post',
            lock: false
        },
        {
            url: '/apple_verify',
            handler: apiAppleVerify,
            method: 'post',
            auth: false,
            lock: false
        },

        // 分享签到
        {
            url: '/share_success',
            handler: apiShareSuccess,
            method: 'post'
        },
        {
            url: '/check_in',
            handler: apiCheckIn,
            method: 'post'
        },

        // 俱乐部
        {
            url: '/clubinfo',
            handler: apiGetClubInfo,
            method: 'post',
            lock: false
        },
        {
            url: '/clubs',
            handler: apiGetClubs,
            method: 'post',
            lock: false
        },
        {
            url: '/create_club',
            handler: apiCreateClub,
            method: 'post'
        },
        {
            url: '/join_club',
            handler: apiJoinClub,
            method: 'post',
            lock: false
        },
        {
            url: '/update_club_info',
            handler: apiUpdateClubInfo,
            method: 'post',
            lock: false
        },
        {
            url: '/club_room_settings',
            handler: apiGetClubRoomSettings,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/club_rooms',
            handler: apiGetClubRooms,
            method: 'post',
            auth: false,
            lock: false
        },
        {
            url: '/add_club_room_setting',
            handler: apiAddClubRoomSetting,
            method: 'post',
            lock: false
        },
        {
            url: '/delete_club_room_setting',
            handler: apiDeleteClubRoomSetting,
            method: 'post',
            lock: false
        },
        {
            url: '/approved_club_members',
            handler: apiGetApprovedClubMembers,
            method: 'post',
            lock: false
        },
        {
            url: '/pending_club_members',
            handler: apiGetPendingClubMembers,
            method: 'post',
            lock: false
        },
        {
            url: '/admin_club_members',
            handler: apiGetAdminClubMembers,
            method: 'post',
            lock: false
        },
        {
            url: '/club_member/:id/accept',
            handler: apiAcceptClubMember,
            method: 'post',
            lock: false
        },
        {
            url: '/club_member/:id/reject',
            handler: apiRejectClubMember,
            method: 'post',
            lock: false
        },
        {
            url: '/club_member/:id/delete',
            handler: apiDeleteClubMember,
            method: 'post',
            lock: false
        },
        {
            url: '/search_club_member',
            handler: apiSearchClubMember,
            method: 'post',
            lock: false
        },
        {
            url: '/search_user',
            handler: apiSearchUser,
            method: 'post',
            lock: false
        },
        {
            url: '/invite_club_member',
            handler: apiInviteMember,
            method: 'post',
            lock: false
        },
        {
            url: '/exit_club',
            handler: apiExitClub,
            method: 'post',
            lock: false
        },
        {
            url: '/delete_club',
            handler: apiDeleteClub,
            method: 'post',
            lock: false
        },
        {
            url: '/charge_club_gems',
            handler: apiChargeClubGems,
            method: 'post'
        },
        {
            url: '/transfer_creator_position',
            handler: apiTransferCreatorPosition,
            method: 'post'
        },
        {
            url: '/award_admin_position',
            handler: apiAwardAdminPosition,
            method: 'post'
        },
        {
            url: '/revoke_admin_position',
            handler: apiRevokeAdminPosition,
            method: 'post'
        },
        {
            url: '/get_club_gems',
            handler: apiGetClubGems,
            method: 'post'
        },

        // 比赛场
        {
            url: '/sign_up_match_field',
            handler: apiSignUpMatchField,
            method: 'post',
            lock: false
        },
        {
            url: '/cancel_sign_up_match_field',
            handler: apiCancelSignUpMatchField,
            method: 'post',
            lock: false
        },
        {
            url: '/get_next_match_field_info',
            handler: apiGetNextMatchFieldInfo,
            method: 'post',
            lock: false
        },
        {
            url: '/get_match_winner_info',
            handler: apiGetMatchWinnerInfo,
            method: 'post',
            lock: false
        },
        {
            url:'/get_client_list',
            handler: apiGetClientsInfo,
            method: 'post',
            lock : false
        }
    ]);

    // 微信支付
    var wechat_pay = require('../../../shared/modules/pay/wechat_pay');
    main_app.post('/weixin/wxpay_notify', wechat_pay.notify);
};