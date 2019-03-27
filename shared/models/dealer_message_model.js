/**
 * Created by leo on 12/8/2017.
 *
 * 【代理系统公告】
 *
 *  由于没有在线商城, 暂时不需要(2018-05-20)
 */

var Model = require('./model');

function DealerMessageModel() {
    Model.call(this);

    this.model = 'dealer_messages';
}

DealerMessageModel.prototype = new Model();
DealerMessageModel.prototype.constructor = DealerMessageModel;

global.DealerMessageModel = new DealerMessageModel();
module.exports = global.DealerMessageModel;