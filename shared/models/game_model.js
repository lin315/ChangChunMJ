/**
 * Created by leo on 12/5/2017.
 *
 * 【子游戏】
 */
var Model = require('./model');

function GameModel() {
    Model.call(this);

    this.model = 'games';

    // 游戏类型
    this.TYPE = {
        MAHJONG: 'mahjong',
        POKER: 'poker'
    };

    // 游戏状态
    this.STATUS = {
        ACTIVE: 'active',
        INACTIVE: 'inactive'
    };

    /**
     * 获取所有在线游戏
     *
     * @param {Function} callback 回调
     */
    this.getActiveGames = function(callback) {
        this.getByFields([['status', this.STATUS.ACTIVE]], callback);
    };
}

GameModel.prototype = new Model();
GameModel.prototype.constructor = GameModel;

global.GameModel = new GameModel();
module.exports = global.GameModel;