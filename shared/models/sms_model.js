/**
 * Created by leo on 12/5/2017.
 *
 * 【短信验证 - 阿里云】
 *
 * 由于没有手机认证, 暂时不需要(2018-05-20)
 */

var Model = require('./model');

// 阿里云短信服务参数设置@begin
var SmsClient = require('@alicloud/sms-sdk/index');
var ACCESS_KEY_ID = 'LTAIPy1APdUv5JaI';
var SECRET_ACCESS_KEY = '6e6xddlf09vMELEyhGsoFy79M6Sa2a';
var SIGN_NAME = '新彭泽杂胡';
var TEMPLATE_CODE = 'SMS_116590435';
var EXPIRE_TIME = 10;                 // 验证码有效时间(单位: 分钟)
// 阿里云短信服务参数设置@end

function SmsModel() {
    Model.call(this);

    this.model = 'sms';

    /**
     * 新增一条记录
     *
     * @param phone: 手机号
     * @param code: 验证码
     * @param callback: 回调
     */
    this.createRecord = function(phone, code, callback) {
        var record = {};
        record.phone = phone;
        record.code = code;
        record.created_at = UTIL.getTimeDesc();

        this.create(record, callback);
    };

    /**
     * 获取指定手机和验证码的记录
     *
     * @param phone: 手机号
     * @param code: 验证码
     * @param callback: 回调
     */
    this.getRecord = function(phone, code, callback) {
        var conditions = [];

        conditions.push(['phone', phone]);
        if (code) {
            conditions.push(['code', code]);
        }
        this.getByFields(conditions, function(err, result) {
            if (! err && result.length > 0) {
                callback(err, result[0]);
            } else {
                callback(err, null);
            }
        });
    };

    /**
     * 是否过期的记录
     *
     * @param record: 记录
     * @returns {boolean}
     */
    this.isExpiredRecord = function(record) {
        var now = Date.now();
        var created_at = Math.round(new Date(record.created_at).getTime());

        if (created_at < now - EXPIRE_TIME * 60 * 1000) {
            return true;
        }

        return false;
    };

    /**
     * 发送验证码, 并新增记录
     *
     * @param phone: 手机号
     * @param callback: 回调
     */
    this.sendSMS = function(phone, callback) {
        var code = UTIL.randomNumber(4);
        var self = this;

        // 初始化
        var sms_client = new SmsClient({
            accessKeyId: ACCESS_KEY_ID,
            secretAccessKey: SECRET_ACCESS_KEY
        });

        sms_client.sendSMS({
            PhoneNumbers: phone,
            SignName: SIGN_NAME,
            TemplateCode: TEMPLATE_CODE,
            TemplateParam: '{"code": ' + (code) + '}'
        }).then(function(res) {
            //let { Code } = res;

            var Code = res.Code;

            console.log(res, Code);

            if (Code == 'OK') {
                // 新增一条记录
                self.createRecord(phone, code, callback);
            } else {
                console.log('验证码发送失败 ', Code);
                callback(Code);
            }
        }, function(err) {
            console.log('发送失败', err.stack);
            callback(err);
        });
    };


    /**
     * 清理指定日期之前的所有记录
     *
     * @param date
     */
    this.cleanRecords = function(date) {
        this.query('delete from ' + this.model + ' where created_at <= "' + date + '"');
        this.clearCache();
    };
}

SmsModel.prototype = new Model();
SmsModel.prototype.constructor = SmsModel;

global.SmsModel = new SmsModel();
module.exports = global.SmsModel;