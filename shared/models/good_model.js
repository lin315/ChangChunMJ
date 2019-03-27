/**
 * Created by leo on 12/5/2017.
 *
 * 【商品】
 *
 * 由于没有在线商城, 暂时不需要(2018-05-20)
 */
var Model = require('./model');

function GoodModel() {
    Model.call(this);

    this.model = 'goods';
}

GoodModel.prototype = new Model();
GoodModel.prototype.constructor = GoodModel;

global.GoodModel = new GoodModel();
module.exports = global.GoodModel;