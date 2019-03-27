/**
 * Created by leo on 12/7/2017.
 *
 * 【订单】
 *
 * 由于没有在线商城, 暂时不需要(2018-05-20)
 */

var Pay = module_manager.getModule(CONST.MODULE.PAY);
var Event = module_manager.getModule(CONST.MODULE.EVENT);

var Model = require('./model');

function OrderModel() {
    Model.call(this);

    this.model = 'orders';

    this.STATUS = {
        WAITING: 'waiting',
        SUCCESS: 'success'
    };

    /**
     * 创建订单
     *
     * @param user_id: 用户ID
     * @param good: 商品信息
     * @param channel: 支付渠道
     * @param native_pay: 是否原生支付
     * @param ip_address: IP
     * @param callback: 回调
     */
    this.createOrder = function(user_id, good, channel, native_pay, ip_address, callback) {
        callback = callback || function() {};

        var order = {};
        order.good_id = good.id;
        order.good_name = good.name;
        order.good_type = good.type;
        order.user_id = user_id;
        order.price = good.price;
        order.count = good.count;
        order.channel = channel;
        order.status = this.STATUS.WAITING;
        order.created_at = UTIL.getTimeDesc();

        this.create(order, function(err, order_info) {
            if (err) {
                return callback(err);
            }

            Pay.prepare(channel, native_pay, order_info.id, good.name, good.price, ip_address, function(err, prepay_info) {
                if (err) {
                    return callback(err);
                }

                callback(null, {
                    order_info: order_info,
                    prepay_info: prepay_info
                });
            });
        });
    };

    /**
     * 订单支付成功时的回调
     *
     * @param {string} order_id: 订单号
     * @param {string} trade_no: 渠道流水号
     * @param {number} total_amount: 支付费用
     * @param {function} callback: 回调
     */
    this.orderPayed = function(order_id, trade_no, total_amount, callback) {
        // 获取订单信息
        var self = this;
        this.lockAndGet(order_id, function(err, order_info) {
            if (err) {
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            if (! order_info) {
                self.unlock(order_id);
                return callback(new Error(ERROR.MODEL_NOT_FOUND));
            }

            if (order_info.status != self.STATUS.WAITING) {
                return callback(new Error(ERROR.INVALID_OPERATION));
            }

            order_info.status = self.STATUS.SUCCESS;
            order_info.trade_no = trade_no;
            order_info.updated_at = UTIL.getTimeDesc();

            var doProcess = function(good) {
                // 加锁获取用户信息
                UserModel.lockAndGet(order_info.user_id, function(err, user) {
                    if (err || ! user) {
                        UserModel.unlock(order_info.user_id);
                        self.unlock(order_id);
                        return callback(new Error(ERROR.MODEL_NOT_FOUND));
                    }

                    // 订单记录用到
                    var buyer = {
                        id: user.id,
                        name: user.name
                    };

                    // 给用户增加钻石
                    user.gems += order_info.count;

                    // 1. 保存用户信息
                    UserModel.save(user, function(err) {
                        UserModel.unlock(order_info.user_id);

                        if (err) {
                            self.unlock(order_id);
                            return callback(new Error(ERROR.INVALID_OPERATION));
                        }

                        // 2. 保存订单信息
                        self.save(order_info, function() {
                            self.unlock(order_id);

                            //  放到队列中，大厅服务器会读取以后推送给玩家
                            Event.emit(CONST.EVENT.USER_INFO_CHANGED, {
                                user_id: user.id,
                                data: {
                                    award: order_info.count,
                                    gems: user.gems,
                                    reason: CONST.REASON.USER_BUY_GEMS
                                }
                            });

                            // 用户购买, 做记录
                            OrderLogModel.create({
                                type: OrderLogModel.TYPE.USER_PURCHASE,
                                user_id: user.id,
                                buyer: buyer,
                                good: good,
                                price: total_amount,
                                created_at: UTIL.getTimeDesc()
                            }, function() {});

                            if (user.r_code > 0) {
                                // 2. 更新代理红利信息
                                var parent_dealer_id = user.r_code;
                                // 2.1 一级收入
                                UserModel.lockAndGet(parent_dealer_id, function(err, parent_dealer) {
                                    if (err || ! parent_dealer) {
                                        UserModel.unlock(parent_dealer_id);
                                        console.error('【订单】找不到用户的父代理');
                                        return callback(null);
                                    }

                                    if (parent_dealer.is_dealer != UserModel.DEALER.YES) {
                                        UserModel.unlock(parent_dealer_id);
                                        return callback(null);
                                    }

                                    // 根据推荐用户数, 获取抽水比例
                                    UserModel.getChildUserCount(parent_dealer_id, function(err, child_count) {
                                        if (err) {
                                            UserModel.unlock(parent_dealer_id);
                                            return callback(null);
                                        }

                                        DealerRateModel.getByUserCount(child_count, function(err, dealer_rate) {
                                            if (err) {
                                                UserModel.unlock(parent_dealer_id);
                                                return callback(null);
                                            }

                                            var first_income = parseFloat(total_amount * dealer_rate.first_rate / 100);
                                            parent_dealer.money += first_income;

                                            // 更新
                                            UserModel.save(parent_dealer, function(err, result) {
                                                UserModel.unlock(parent_dealer_id);
                                                if (err || ! result) {
                                                    console.error('【订单】更新一级收入失败');
                                                    return callback(null);
                                                }

                                                // 一级收入成功加到代理, 做记录
                                                OrderLogModel.create({
                                                    type: OrderLogModel.TYPE.FIRST_INCOME,
                                                    user_id: parent_dealer.id,
                                                    buyer: buyer,
                                                    good: good,
                                                    price: first_income,
                                                    created_at: UTIL.getTimeDesc()
                                                }, function() {});

                                                // 2. 更新二级收入
                                                var ancestor_dealer_id = parent_dealer.r_code;
                                                UserModel.lockAndGet(ancestor_dealer_id, function(err, ancestor_dealer) {
                                                    if (err || ! ancestor_dealer) {
                                                        UserModel.unlock(ancestor_dealer_id);
                                                        return callback(null);
                                                    }

                                                    if (ancestor_dealer.is_dealer != UserModel.DEALER.YES) {
                                                        UserModel.unlock(ancestor_dealer_id);
                                                        return callback(null);
                                                    }

                                                    // 根据推荐用户数, 获取抽水比例
                                                    UserModel.getChildUserCount(ancestor_dealer_id, function(err, child_count) {
                                                        if (err) {
                                                            UserModel.unlock(ancestor_dealer_id);
                                                            return callback(null);
                                                        }

                                                        DealerRateModel.getByUserCount(child_count, function (err, dealer_rate) {
                                                            if (err) {
                                                                UserModel.unlock(ancestor_dealer_id);
                                                                return callback(null);
                                                            }

                                                            var second_income = parseFloat(first_income * dealer_rate.second_rate / 100);
                                                            ancestor_dealer.money += second_income;

                                                            // 更新
                                                            UserModel.save(ancestor_dealer, function (err, result) {
                                                                UserModel.unlock(ancestor_dealer_id);
                                                                if (err || !result) {
                                                                    console.error('【订单】更新一级收入失败');
                                                                    return callback(null);
                                                                }

                                                                // 二级收入成功加到代理, 做记录
                                                                OrderLogModel.create({
                                                                    type: OrderLogModel.TYPE.SECOND_INCOME,
                                                                    user_id: ancestor_dealer.id,
                                                                    buyer: buyer,
                                                                    good: good,
                                                                    price: second_income,
                                                                    created_at: UTIL.getTimeDesc()
                                                                }, function () {
                                                                });

                                                                // 都成功了, 平息(不用大厅推送)
                                                                return callback(null);
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    })
                                });
                            } else {
                                return callback(null);
                            }
                        });
                    });
                });
            };

            // 获取商品信息
            GoodModel.getByID(order_info.good_id, function(err, good) {
                if (err || ! good) {
                    return callback(new Error(ERROR.MODEL_NOT_FOUND));
                }

                doProcess(good);
            });
        });
    };

    /**
     * 获取今日充值总额
     *
     * @param {string} today: 日期
     * @param {function} callback: 回调
     */
    this.getChargeAmount = function(today, callback) {
        this.getSumEx([['status', this.STATUS.SUCCESS], ['created_at', 'like', today + '%']], 'price', callback);
    }

    /**
     * 清理指定日期之前的所有未成功记录
     *
     * @param date
     */
    this.cleanRecords = function(date) {
        this.query('delete from ' + this.model + ' where created_at <= "' + date + '" and ' + 'status = "' + this.STATUS.WAITING + '"');
        this.clearCache();
    };
}

OrderModel.prototype = new Model();
OrderModel.prototype.constructor = OrderModel;

global.OrderModel = new OrderModel();
module.exports = global.OrderModel;