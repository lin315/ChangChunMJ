/**
 * Created by leo on 4/10/2018.
 *
 * 【俱乐部】
 */

var Model = require('./model');

function ClubModel() {
    Model.call(this);

    this.model = 'clubs';

    /**
     * 获取用户创建的俱乐部数
     *
     */
    this.getClubCountOfUser = function(user_id, callback) {
        var conditions = [['creator_id', user_id]];

        this.getCountEx(conditions, callback);
    };

    /**
     * 创建俱乐部
     *
     * @param club
     * @param callback
     */
    this.createClub = function(club, callback) {
        // 产生随机的俱乐部ID
        var id = UTIL.randomNumber(6);

        var self = this;
        this.getByID(id, function(err, db_club) {
            if (err) {
                return callback(err);
            }

            // 已经有ID, 重新生成
            if (db_club) {
                return self.createClub(club, callback);
            }

            // 创建新的俱乐部
            club.id = id;
            self.create(club, callback);
        });
    };

    /**
     * 获取指定用户的俱乐部列表
     *
     * @param user_id
     * @param callback
     */
    this.getClubsOfUser = function(user_id, callback) {
        var self = this;
        ClubMemberModel.getClubIDAndPositionsOfUser(user_id, function(err, club_id_and_positions) {
            if (err) {
                return callback(err);
            }

            var club_ids = [];
            var club_positions = [];

            for (var i = 0; i < club_id_and_positions.length; i++) {
                club_ids.push(club_id_and_positions[i].club_id);
                club_positions.push(club_id_and_positions[i].position);
            }

            self.getByFields([['id', 'in', club_ids]], function(err, clubs) {
                if (err) {
                    return callback(err);
                }

                // 插入position
                for (var i = 0; i < clubs.length; i++) {
                    var index = club_ids.indexOf(clubs[i].id);
                    if (index >= 0) {
                        clubs[i].position = club_positions[index];

                    }
                }

                callback(null, clubs);
            });
        })
    }
}

ClubModel.prototype = new Model();
ClubModel.prototype.constructor = ClubModel;

global.ClubModel = new ClubModel();
module.exports = global.ClubModel;
