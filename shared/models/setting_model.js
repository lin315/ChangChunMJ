/**
 * Created by leo on 12/5/2017.
 *
 * 【系统设置】
 */
var Model = require('./model');

function SettingModel() {
    Model.call(this);

    this.model = 'settings';

    this.getSettings = function(callback) {
        return this.getOne([], callback);
    }
}

SettingModel.prototype = new Model();
SettingModel.prototype.constructor = SettingModel;

global.SettingModel = new SettingModel();
module.exports = global.SettingModel;