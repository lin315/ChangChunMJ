/**
 * Created by leo on 12/5/2017.
 *
 * 【代理提现申请】
 * .
 * 由于没有在线商城, 暂时不需要(2018-05-20)
 */
var Model = require('./model');

function DealerWithdrawModel() {
    Model.call(this);

    this.model = 'dealer_withdraws';

    this.STATUS = {
        PENDING: 'pending',
        ACCEPTED: 'accepted',
        REJECTED: 'rejected'
    };

    /**
     * 创建提现申请记录
     *
     * @param dealer_id: 代理ID
     * @param amount: 金额
     * @param callback: 回调
     */
    this.createRequest = function(dealer_id, amount, callback) {
        var request = {
            user_id: dealer_id,
            amount: amount,
            status: this.STATUS.PENDING,
            created_at: UTIL.getTimeDesc()
        };

        this.create(request, callback);
    };
}

DealerWithdrawModel.prototype = new Model();
DealerWithdrawModel.prototype.constructor = DealerWithdrawModel;

global.DealerWithdrawModel = new DealerWithdrawModel();
module.exports = global.DealerWithdrawModel;