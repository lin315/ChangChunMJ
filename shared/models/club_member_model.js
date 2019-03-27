/**
 * Created by leo on 4/10/2018.
 *
 * 【俱乐部成员】
 */

var Model = require('./model');

function ClubMemberModel() {
    Model.call(this);

    this.model = 'club_members';

    // 成员状态
    this.STATUS = {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected'
    };

    // 职位
    this.POSITION = {
        CREATOR: 'creator',
        ADMIN: 'admin',
        MEMBER: 'member'
    };

    /**
     * 获取指定用户的俱乐部(id & 职位)列表
     *
     * @param user_id
     * @param callback
     */
    this.getClubIDAndPositionsOfUser = function(user_id, callback) {

        var conditions = [['member_id', user_id], ['status', this.STATUS.APPROVED]];

        this.getByFields(conditions, function(err, club_members) {
            if (err) {
                return callback(err);
            }

            var result = [];
            // 解析club_id, position字段
            for (var i = 0; i < club_members.length; i++) {
                result.push({
                    club_id: club_members[i].club_id,
                    position: club_members[i].position
                });
            }

            callback(null, result);
        });
    };

    /**
     * 获取指定用户的俱乐部ID列表
     *
     * @param user_id
     * @param callback
     */
    this.getClubIDsOfUser = function(user_id, callback) {
        var conditions = [['member_id', user_id], ['status', this.STATUS.APPROVED]];

        this.getByFields(conditions, function(err, club_members) {
            if (err) {
                return callback(err);
            }

            var club_ids = [];
            // 解析club_id字段
            for (var i = 0; i < club_members.length; i++) {
                club_ids.push(club_members[i].club_id);
            }

            callback(null, club_ids);
        });
    };

    /**
     * 获取指定俱乐部的所有成员ID
     *
     * @param club_id
     * @param status
     * @param callback
     */
    this.getMemberIDsOfClub = function(club_id, status, callback) {
        var conditions = [['club_id', club_id], ['status', status]];

        this.getByFields(conditions, function(err, club_members) {
            if (err) {
                return callback(err);
            }

            var member_ids = [];
            // 解析member_id字段
            for (var i = 0; i < club_members.length; i++) {
                member_ids.push(club_members[i].member_id);
            }

            callback(null, member_ids);
        });
    };

    /**
     * 获取已通过的成员ID列表
     *
     * @param club_id
     * @param callback
     */
    this.getApprovedMemberIDsOfClub = function(club_id, callback) {
        this.getMemberIDsOfClub(club_id, this.STATUS.APPROVED, callback);
    };

    /**
     * 获取待处理的成员ID列表
     *
     * @param club_id
     * @param callback
     */
    this.getPendingMemberIDsOfClub = function(club_id, callback) {
        this.getMemberIDsOfClub(club_id, this.STATUS.PENDING, callback);
    };

    /**
     * 获取指定俱乐部的所有成员列表
     *
     * @param club_id
     * @param status
     * @param keyword
     * @param callback
     */
    this.getMembersOfClub = function(club_id, status, keyword, callback) {
        var conditions = [];
        conditions.push(['club_id', club_id]);
        if (status) {
            conditions.push(['status', status]);
        }
        if (keyword) {
            conditions.push(['member_id', keyword]);
        }

        this.getByFields(conditions, function(err, club_members) {
            if (err) {
                return callback(err);
            }

            return callback(null, club_members);
        });
    };

    /**
     * 获取指定俱乐部的所有成员列表
     *
     * @param club_id
     * @param keyword
     * @param callback
     */
    this.getAdminsOfClub = function(club_id, keyword, callback) {
        var conditions = [];
        conditions.push(['club_id', club_id]);
        conditions.push(['position', this.POSITION.ADMIN]);

        if (keyword) {
            conditions.push(['member_id', keyword]);
        }

        this.getByFields(conditions, function(err, club_members) {
            if (err) {
                return callback(err);
            }

            return callback(null, club_members);
        });
    };

    /**
     * 指定用户是否指定俱乐部成员
     *
     * @param user_id
     * @param club_id
     * @param callback
     */
    this.isMemberOfClub = function(user_id, club_id, callback) {
        this.getCountEx([['member_id', user_id], ['club_id', club_id], ['status', this.STATUS.APPROVED]], callback);
    };
}

ClubMemberModel.prototype = new Model();
ClubMemberModel.prototype.constructor = ClubMemberModel;

global.ClubMemberModel = new ClubMemberModel();
module.exports = global.ClubMemberModel;