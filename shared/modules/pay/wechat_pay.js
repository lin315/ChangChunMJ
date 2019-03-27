/**
 * Created by leo on 12/7/2017.
 */

var util = require('../../utils/util');
var crypto = require('crypto');
var request = require('request');
var xml2js = require('xml2js');

var PAY_CONFIG = {
    APP_ID: 'wx6cb0fb1eab2b2cb0',
    APP_SECRET: '47a877dda0cff89f76ea8e29ef921aae',
    MCH_ID: '1486669762',
    API_KEY: 'Jj201707191916Mj1981081836WWLch0',
    NOTIFY_URL: 'http://ipzzh.cn:3001/weixin/wxpay_notify',
    REDIRECT_URL: 'http://ipzzh.cn/pengze/index.html'       //  支付之后显示的页面（仅限于H5支付）
};

var WechatPay = {
    /**
     * 进行签名
     *
     * @param param
     * @return {*}
     */
    sign: function(param) {
        var querystring = Object.keys(param).filter(function(key) {
                return param[key] !== undefined && param[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key) < 0;
            }).sort().map(function(key){
                return key + '=' + param[key];
            }).join("&") + "&key=" + PAY_CONFIG.API_KEY;

        return crypto.createHash('md5').update(querystring, 'utf8').digest('hex').toUpperCase();
    },

    /**
     * 生成预支付订单, 并返回
     *
     * @param order_id
     * @param native_pay: 是否原生支付
     * @param name
     * @param total_amount
     * @param ip_address
     * @param callback
     */
    pay: function(order_id, native_pay, name, total_amount, ip_address, callback) {
        var nonce_str = UTIL.generateNonceStr();
        var timestamp = UTIL.generateTimeStamp();
        var url = "https://api.mch.weixin.qq.com/pay/unifiedorder";
        var total_fee = Math.round(total_amount * 100);

        if (native_pay == 1 || native_pay == true) {
            native_pay = true;
        } else {
            native_pay = false;
        }

        var data = {
            appid: PAY_CONFIG.APP_ID,
            body: name,
            mch_id: PAY_CONFIG.MCH_ID,
            nonce_str: nonce_str,
            notify_url: PAY_CONFIG.NOTIFY_URL,
            out_trade_no: order_id,
            spbill_create_ip: ip_address,
            total_fee: total_fee,
            trade_type: (native_pay) ? 'APP' : 'MWEB'   // 原生/H5支付
        };
        data.sign = this.sign(data);
        var xml_builder = new xml2js.Builder();

        var self = this;
        request({
            url: url,
            method: 'POST',
            body: xml_builder.buildObject(data)
        }, function(err, response, body) {
            if (! err && response.statusCode == 200) {
                var parser = new xml2js.Parser({
                    trim: true,
                    explicitArray: false,
                    explicitRoot: false
                });

                parser.parseString(body, function(err, params) {
                    if (err) {
                        return callback(err);
                    }

                    var ret = {};

                    ret.appid = PAY_CONFIG.APP_ID;
                    ret.noncestr =  nonce_str;
                    ret.package = 'Sign=WXPay';
                    ret.partnerid = PAY_CONFIG.MCH_ID;
                    ret.prepayid = params['prepay_id'];
                    ret.timestamp = timestamp;

                    if (! native_pay) {
                        // 下面几个是H5支付固有的参数
                        ret.mweburl = escape(params['mweb_url'] + '&redirect_url=' + encodeURIComponent(PAY_CONFIG.REDIRECT_URL));
                    }

                    ret.sign = self.sign(ret);
                    callback(null, ret);
                });
            } else {
                callback(err);
            }
        });
    },

    /**
     * 支付回调通知
     *
     * @param req
     * @param res
     */
    notify: function(req, res) {
        var params = req.body.xml;

        if (params['return_code'] == 'SUCCESS' && params['result_code'] == 'SUCCESS') {
            var sign = WechatPay.sign(params);

            if (sign == params['sign']) {
                // console.log('验证成功');
                OrderModel.orderPayed(params['out_trade_no'], params['transaction_id'], params['total_fee'] / 100, function(err, data) {
                    if (err) {
                        console.log(err.toString());

                        return res.send('fail');
                    }
                    res.send('success');
                });
            } else {
                console.log('验证失败');
                res.send('fail');
            }
        } else {
            res.send('fail');
        }
    }
};

module.exports = WechatPay;