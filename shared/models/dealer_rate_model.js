/**
 * Created by leo on 12/5/2017.
 *
 * 【代理抽水比例】
 *
 *  由于没有在线商城, 暂时不需要(2018-05-20)
 */
var Model = require('./model');

function DealerRateModel() {
    Model.call(this);

    this.model = 'dealer_rates';

    /**
     * 根据推荐人数, 获取代理抽水比例
     *
     * @param user_count: 推荐人数
     * @param callback: 回调
     */
    this.getByUserCount = function(user_count, callback) {
        this.getByFields([['min_count', '<=', user_count], ['max_count', '>=', user_count]], function(err, result) {
            if (! err && result.length > 0) {
                callback(err, result[0]);
            } else {
                callback(err, null);
            }
        });
    };
}

DealerRateModel.prototype = new Model();
DealerRateModel.prototype.constructor = DealerRateModel;

global.DealerRateModel = new DealerRateModel();
module.exports = global.DealerRateModel;