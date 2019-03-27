/**
 * Created by leo on 12/2/2017.
 */
var schedule = require('pomelo-schedule');

var app;

var Job = function() {

    /**
     * 统计
     *
     * @param data
     */
    this.statisticJob = function(data) {
        console.log('Run Job: ', data.name);

        var today = UTIL.getDateAfterDays(-1);
        var month = UTIL.getDateAfterDays(-1, '{0}-{1}');
        var year = UTIL.getDateAfterDays(-1, '{0}');
        var all = 'all';

        function unified_set(key, new_value, today_st, month_st, year_st, all_st) {
            if (today_st[key] < new_value)
                today_st[key] = new_value;

            if (month_st[key] < new_value)
                month_st[key] = new_value;

            if (year_st[key] < new_value)
                year_st[key] = new_value;

            if (all_st[key] < new_value)
                all_st[key] = new_value;
        }

        function unified_incr(key, value_incr, today_st, month_st, year_st, all_st) {
            all_st[key] += value_incr;
            year_st[key] += value_incr;
            month_st[key] += value_incr;
            today_st[key] += value_incr;
        }

        // 做今天的统计
        StatisticModel.getOrNew(StatisticModel.DT_ALL, all, function(err1, all_st) {
           StatisticModel.getOrNew(StatisticModel.DT_YEAR, year, function(err2, year_st) {
               StatisticModel.getOrNew(StatisticModel.DT_MONTH, month, function(err3, month_st) {
                   StatisticModel.getOrNew(StatisticModel.DT_DATE, today, function(err4, today_st) {
                       if (err1 || err2 || err3 || err4) {
                           return;
                       }

                        UserModel.getTotalCount(function(err1, total_user_count) {
                            UserModel.getTotalCountByPlatform(UserModel.PLATFORM.IOS, function(err2, ios_user_count) {
                                UserModel.getTotalCountByPlatform(UserModel.PLATFORM.ANDROID, function(err3, android_user_count) {
                                    UserModel.getRegisteredCount(today, function (err4, today_registered_user_count) {
                                        UserModel.getActiveUserCount(today, function (err5, today_active_user_count) {
                                            RoomModel.getRoomCount(today, function (err6, today_room_count) {
                                                RoomModel.getPrivateRoomCount(today, function (err7, today_private_room_count) {
                                                    RoomModel.getClubRoomCount(today, function (err8, today_club_room_count) {
                                                        RoomModel.getMatchRoomCount(today, function (err9, today_match_room_count) {
                                                            if (err1 || err2 || err3 || err4 || err5 || err6 || err7 || err8 || err9) {
                                                                return;
                                                            }

                                                            unified_set("total_user_count", total_user_count, today_st, month_st, year_st, all_st);
                                                            unified_set("ios_user_count", ios_user_count, today_st, month_st, year_st, all_st);
                                                            unified_set("android_user_count", android_user_count, today_st, month_st, year_st, all_st);
                                                            unified_incr("registered_user_count", today_registered_user_count, today_st, month_st, year_st, all_st);
                                                            unified_incr("active_user_count", today_active_user_count, today_st, month_st, year_st, all_st);
                                                            unified_incr("room_count", today_room_count, today_st, month_st, year_st, all_st);
                                                            unified_incr("private_room_count", today_private_room_count, today_st, month_st, year_st, all_st);
                                                            unified_incr("club_room_count", today_club_room_count, today_st, month_st, year_st, all_st);
                                                            unified_incr("match_room_count", today_match_room_count, today_st, month_st, year_st, all_st);

                                                            StatisticModel.save(all_st);
                                                            StatisticModel.save(year_st);
                                                            StatisticModel.save(month_st);
                                                            StatisticModel.save(today_st);
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                   });
               });
           });
        });
    };

    /**
     * 过期处理
     *
     * @param data
     */
    this.dailyCleanJob = function(data) {
        console.log('Run Job: ', data.name);

        // 1. 删除1个月以前的游戏记录(游戏房间, 回合, 比赛场, 比赛场获奖者, 周赛报名)
        var month_ago = UTIL.getDateAfterDays(-30) + " 00:00:00";
        RoomModel.getIDs([['created_at', '<', month_ago]], function(err, room_ids) {
            if (err) {
                return;
            }

            for (var i = 0; i < room_ids.length; i++) {
                RoomModel.delete(room_ids[i]);
            }
        });
        RoundModel.getIDs([['created_at', '<', month_ago]], function(err, round_ids) {
            if (err) {
                return;
            }

            for (var i = 0; i < round_ids.length; i++) {
                RoundModel.delete(round_ids[i]);
            }
        });
        MatchFieldModel.getIDs([['created_at', '<', month_ago]], function(err, match_field_ids) {
            if (err) {
                return;
            }

            for (var i = 0; i < match_field_ids.length; i++) {
                MatchFieldModel.delete(match_field_ids[i]);
            }
        });
        MatchWinnerModel.getIDs([['created_at', '<', month_ago]], function(err, match_winner_ids) {
            if (err) {
                return;
            }

            for (var i = 0; i < match_winner_ids.length; i++) {
                MatchWinnerModel.delete(match_winner_ids[i]);
            }
        });
        MatchEntryFormModel.getIDs([['created_at', '<', month_ago], ['type', CONST.MATCH_TYPE.WEEK]], function(err, match_entry_form_ids) {
            if (err) {
                return;
            }

            for (var i = 0; i < match_entry_form_ids.length; i++) {
                MatchEntryFormModel.delete(match_entry_form_ids[i]);
            }
        });

        // 2. 删除一个星期以前的记录(日赛报名)
        var week_ago = UTIL.getDateAfterDays(-7) + " 00:00:00";
        MatchEntryFormModel.getIDs([['created_at', '<', week_ago], ['type', CONST.MATCH_TYPE.DAY]], function(err, match_entry_form_ids) {
            if (err) {
                return;
            }

            for (var i = 0; i < match_entry_form_ids.length; i++) {
                MatchEntryFormModel.delete(match_entry_form_ids[i]);
            }
        });

        // 3. 删除昨天以前的记录(签到, 分享)
        var yesterday = UTIL.getDateAfterDays(-1) + " 23:59:59";
        CheckInModel.cleanRecords(yesterday);
        ShareModel.cleanRecords(yesterday);
        MatchEntryFormModel.cleanDailyRecords(yesterday);

        // 4. 删除昨天以前的短信验证记录
        // SmsModel.cleanRecords(yesterday);
        // 5. 删除昨天未成功的购买记录
        // OrderModel.cleanRecords(yesterday);
    };

    /**
     * 比赛场开赛
     *
     * @param data
     */
    this.startMatch = function(data) {
        console.log(data.name);
        var day = new Date().getDay();
        var hour = new Date().getHours();

        SettingModel.getSettings(function(err, settings) {
            if (err || ! settings) {
                return;
            }

            if (settings.day_match_begin_at_hour <= hour && hour <= settings.day_match_end_at_hour) {
                // 开日赛
                app.rpc.game.gameRemote.startMatch(null, CONST.MATCH_TYPE.DAY, function(result) {});
            }

            if (settings.week_match_start_at_hour === hour && settings.week_match_start_day === day) {
                // 开周赛
                app.rpc.game.gameRemote.startMatch(null, CONST.MATCH_TYPE.WEEK, function(result) {});
            }
        });
    };

    /**
     * 初始化
     *
     * @param main_app
     */
    this.init = function(main_app) {
        app = main_app;

        // 统计(每天凌晨0点0分1秒)
        schedule.scheduleJob("1 0 0 * * *", this.statisticJob.bind(this), {name: 'statistic_job'});

        // 过期处理(每天凌晨1点钟)
        schedule.scheduleJob("0 0 1 * * *", this.dailyCleanJob.bind(this), {name: 'daily_clean_job'});

        // 比赛
        //schedule.scheduleJob("0 0 * * * *", this.startMatch.bind(this), {name: 'match_job'});
    };
};

module.exports = new Job();