/**
 * Created by leo on 12/7/2017.
 */

var PayModule = function() {
    this.app = null;
    this.config = null;

    /**
     * 进行预支付操作
     *
     * @param channel: 支付通道
     * @param native_pay: 是否原生支付
     * @param order_id: 订单号
     * @param goods_name: 商品名称
     * @param price: 价格
     * @param ip_address: IP
     * @param callback: 回调
     * @returns {*}
     */
    this.prepare = function(channel, native_pay, order_id, goods_name, price, ip_address, callback) {
        // 苹果内购不需要预支付
        if (channel == CONST.PAY_CHANNEL.IAP) {
            return callback(null, '');
        }

        // 调试模式, 支付0.01元测试
        if (this.config.debug) {
            price = 0.01;
        }

        if (channel == CONST.PAY_CHANNEL.WECHAT_PAY) {
            this.wechat_pay.pay(order_id, native_pay, goods_name, price, ip_address, callback);
        } else {
            return callback(new Error(ERROR.UNSUPPORTED_FORMAT));
        }
    };

    /**
     * verifyWithRetry the receipt
     * @param {String} receipt 支付凭证
     * @param {Function} callback 回调
     */
    this.verifyIAP = function (receipt, callback) {
        var self = this;
        //  进行验证
        this.IAPVerifier.verifyWithRetry(receipt, true, function (err, data) {
            if (err)
                return callback(err);

            var receipt = data.receipt;
            var bundle_id = CONST.BUNDLE_ID;
            if (receipt.bundle_id != bundle_id) {
                console.log('IAP verify error: Bundle ID is not match!' + receipt.bundle_id);
                return callback(new Error());
            }

            console.log('IAP verify result:' + JSON.stringify(data));

            callback(null, receipt.in_app);
        });
    };

    /**
     * 初始化
     *
     * @param app: 应用
     * @param config: 设置
     * @param callback: 回调
     */
    this.init = function(app, config, callback) {
        callback = callback || function () {};

        this.app = app;
        this.config = config;

        this.wechat_pay = require('./wechat_pay');
        this.IAPVerifier = require('./IAPVerifier');

        callback(null);
    };
};

module.exports = new PayModule();