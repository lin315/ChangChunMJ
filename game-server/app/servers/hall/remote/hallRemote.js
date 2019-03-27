module.exports = function(app) {
	return new HallRemote(app);
};

var HallRemote = function(app) {
    this.app = app;
    this.channel_service = app.get('channelService');

    /**
     * 用户登录
     *
     * @param {String} uid: 用户ID
     * @param sid: 服务器ID
     * @param ip: IP
	 * @param msg: 附带信息（主要包括定位信息）
     *      lat - 纬度
     *      lon - 经度
     *      address - 当前地址
     * @param next
     */
    this.userLogin = function(uid, sid, ip, msg, next) {
        var channel, record;

        // 全体通道
        channel = this.channel_service.getChannel(CONST.CHANNEL.ALL_USERS, true);
		record = channel.getMember(uid);

		if (record) {
			record.sid = sid;
		} else {
			channel.add(uid, sid);
		}

		// 俱乐部通道
        var self = this;
        ClubMemberModel.getClubIDsOfUser(uid, function(err, club_ids) {
            if (err) {
                return console.error(ERROR.INVALID_OPERATION);
            }

            for (var i = 0; i < club_ids.length; i++) {
                var club_id = club_ids[i];
                channel = self.channel_service.getChannel(CONST.CHANNEL.CLUB + club_id, true);
                record = channel.getMember(uid);
                if (record) {
                    record.sid = sid;
                } else {
                    channel.add(uid, sid);
                }
            }
        });

		UserModel.lockAndGet(uid, function(err, user) {
			if (err || ! user) {
				UserModel.unlock(uid);
				return next(new Error(ERROR.MODEL_NOT_FOUND));
			}

			// 更新用户信息
			user.is_online = 1;                                                                                         //  在线
			user.ip = ip;                                                                                               //  IP
			// user.address = msg.address;                                                                              //  地址(保留)
            user.platform = msg.platform;                                                                               //  登录平台
            user.version = msg.version;                                                                                 //  客户端版本
			user.last_login_time = UTIL.getTimeDesc();

			UserModel.save(user, function(err) {
                UserModel.unlock(uid);

				if (err) {
                    return next(new Error(ERROR.INVALID_OPERATION));
				}

				next(null, user);
			});
		});
    };

    /**
	 * 用户离线
	 *
     * @param uid
     * @param sid
     * @param next
     */
    this.userDisconnected = function(uid, sid, next) {
        var channel;

        // 全体通道
        channel = this.channel_service.getChannel(CONST.CHANNEL.ALL_USERS, true);
        channel.leave(uid, sid);

        // 俱乐部通道
        var self = this;
        ClubMemberModel.getClubIDsOfUser(uid, function(err, club_ids) {
            if (err) {
                return console.error(ERROR.INVALID_OPERATION);
            }

            for (var i = 0; i < club_ids.length; i++) {
                var club_id = club_ids[i];
                channel = self.channel_service.getChannel(CONST.CHANNEL.CLUB + club_id, true);
                channel.leave(uid, sid);
            }
        });

        UserModel.lockAndGet(uid, function(err, user) {
            if (err || ! user) {
                UserModel.unlock(uid);
                return next(new Error(ERROR.MODEL_NOT_FOUND));
            }

            // 更新用户为下线
            user.is_online = 0;

            UserModel.save(user, function(err) {
                UserModel.unlock(uid);

                if (err) {
                    return next(new Error(ERROR.INVALID_OPERATION));
                }

                next(null);
            });
        });
    };
};