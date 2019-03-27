/**
 * Created by leo on 12/3/2017.
 *
 * 【管理员】
 */

var Model = require('./model');

function AdminModel() {
    Model.call(this);

    this.model = 'admins';
    this.private_fields = ['password'];

    this.LEVEL = {
        SUPER: 10,                                                                                                      //  超管管理员
        NORMAL: 5,                                                                                                      //  普通管理员
        GUEST: 0                                                                                                        //  管理员(只读)
    };

    /**
     * 根据account获取管理员信息
     *
     * @param account: 账号类型
     * @param callback: 回调
     */
    this.getByAccount = function(account, callback) {
        this.getByFields([['account', account]], function(err, result) {
            if (! err && result.length > 0) {
                callback(err, result[0]);
            } else {
                callback(err, null);
            }
        });
    };
}

AdminModel.prototype = new Model();
AdminModel.prototype.constructor = AdminModel;

global.AdminModel = new AdminModel();
module.exports = global.AdminModel;