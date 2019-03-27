/**
 * Created by leo on 12/5/2017.
 *
 * 【用户购买记录, 代理收入记录】
 *
 * 由于没有在线商城, 暂时不需要(2018-05-20)
 */
var Model = require('./model');

function OrderLogModel() {
    Model.call(this);

    this.model = 'order_logs';
    this.json_fields = ['buyer', 'good'];

    this.TYPE = {
        USER_PURCHASE: 'purchase',              //  用户购买
        FIRST_INCOME: 'first_income',           //  代理一级收入
        SECOND_INCOME: 'second_income'          //  代理二级收入
    };
}

OrderLogModel.prototype = new Model();
OrderLogModel.prototype.constructor = OrderLogModel;

global.OrderLogModel = new OrderLogModel();
module.exports = global.OrderLogModel;