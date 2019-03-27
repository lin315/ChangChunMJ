/**
 * Created by leo on 7/13/2018.
 *
 * 【比赛场赢家表】
 */

var Model = require('./model');

function MatchWinnerModel() {
    Model.call(this);

    this.model = 'match_winners';
}

MatchWinnerModel.prototype = new Model();
MatchWinnerModel.prototype.constructor = MatchWinnerModel;

global.MatchWinnerModel = new MatchWinnerModel();
module.exports = global.MatchWinnerModel;