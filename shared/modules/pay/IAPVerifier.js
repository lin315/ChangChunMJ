/**
 * Created by Administrator on 2017/7/29.
 */
var https = require('https');

function IAPVerifier() {
}

IAPVerifier.productionHost = 'buy.itunes.apple.com';
IAPVerifier.sandBoxHost = 'sandbox.itunes.apple.com';

/**
 * verifyWithRetry the receipt
 * @param {String} receipt 支付凭证
 * @param {boolean} isBase64 是否已Base64编码
 * @param {Function} cb 回调
 */
IAPVerifier.verifyWithRetry = function(receipt, isBase64, cb) {
    var encoded = null, receiptData = {};
    if (isBase64) {
        encoded = receipt;
    } else {
        encoded = new Buffer(receipt).toString('base64');
    }

    receiptData['receipt-data'] = encoded;
    var options = this.requestOptions();
    return this.verify(receiptData, options, (function(_this) {
        return function(error, data) {
            if (error) return cb(error);
            if (21007 === (data != null ? data.status : void 0)) {// && (_this.productionHost == _this.host)) {
                var options = _this.requestOptions();
                // 指向沙盒测试环境再次验证
                options.hostname = _this.sandBoxHost;
                return _this.verify(receiptData, options, function(err, data) {
                    return cb(err, data);
                });
            } else {
                return cb(null, data);
            }
        };
    })(this));
};


/**
 * verify the receipt data
 */
IAPVerifier.verify = function(data, options, cb) {
    var post_data;
    post_data = JSON.stringify(data);
    options.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
    };
    var request = https.request(options, (function(_this) {
        return function(response) {
            var response_chunk = [];
            response.on('data', function(data) {
                if (response.statusCode !== 200) {
                    return cb(new Error("response.statusCode != 200"));
                }
                response_chunk.push(data);
            });
            return response.on('end', function(data) {
                var responseData, totalData;
                totalData = response_chunk.join('');
                try {
                    responseData = JSON.parse(totalData);
                } catch (_error) {
                    return cb(_error);
                }
                return cb(null, responseData);
            });
        };
    })(this));
    request.write(post_data);
    request.end();
    request.on('error', function (exp) {
        console.log('problem with request: ' + exp.message);
    });
};


IAPVerifier.requestOptions = function() {
    return {
        hostname: 'buy.itunes.apple.com',
        port: 443,
        path: '/verifyReceipt',
        method: "POST",
        rejectUnauthorized: false/*不加：返回证书不受信任CERT_UNTRUSTED*/
    };
};

module.exports = IAPVerifier;