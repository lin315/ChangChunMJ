/**
 * Created by leo on 12/5/2017.
 *
 * 【客服】
 */
var Model = require('./model');

function ClientModel() {
    Model.call(this);

    this.model = 'clients';

    this.STATUS = {
        ACTIVE: 'active',
        INACTIVE: 'inactive'
    };

    /**
     * 获取所有客服列表
     *
     * @param {Function} callback 回调
     */
    this.getClients = function(callback) {
        this.getByFields([['status', this.STATUS.ACTIVE]], callback);
    };
}

ClientModel.prototype = new Model();
ClientModel.prototype.constructor = ClientModel;

global.ClientModel = new ClientModel();
module.exports = global.ClientModel;