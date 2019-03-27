/**
 * Created by leo on 12/13/2017.
 */
var MahjongUtil = function() {
    this.GANG_TYPE = {
        MING_GANG: 1,
        AN_GANG: 2,
        PENG_GANG: 3,
        XUANFENG_GANG : 4,
        XI_GANG : 5,
        YAO_GANG : 6,
        JIU_GANG : 7,
        DADAN_GANG : 8,
        BU_GANG : 9
    };

    this.HU_PATTERN = {
        SHISANYAO: 'shisanyao',
        QIDUI: 'qidui',
        PINGHU: 'pinghu',
        JIAHU: 'jiahu',
        PIAOHU: 'piaohu'
    };

    this.piaohuFlag = false;
    this.hupai = [];
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  麻将工具类
    //
    //  isJinPai:                               是否金牌
    //  isYaoPai:                               是否幺牌
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 是否金牌
     *
     */
    this.isJinPai = function(jin_pais, pai) {
        return (jin_pais.indexOf(pai) !== -1);
    };

    /**
     * 是否幺牌
     *
     */
    /*this.isYaoPai = function(pai) {
        pai = parseInt(pai);

        var pais = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

        return (pais.indexOf(pai) !== -1);
    };*/

    /**
     * 是否风牌
     */
    this.isFengPai = function(pai) {
        pai = parseInt(pai);
        var pais = [30, 31, 32, 33, 9];
        return (pais.indexOf(pai) !== -1);
    };

    /**
     * 是否字牌
     */
    this.isXiPai = function(pai) {
        pai = parseInt(pai);
        var pais = [27, 28, 29, 9];
        return (pais.indexOf(pai) !== -1);
    };

    /**
     * 是否幺牌
     */
    this.isYaoPai = function(pai) {
        pai = parseInt(pai);
        var pais = [0, 9, 18];
        return (pais.indexOf(pai) !== -1);
    };

    /**
     * 是否九牌
     */
    this.isJiuPai = function(pai) {
        pai = parseInt(pai);
        var pais = [8, 17, 26, 9];
        return (pais.indexOf(pai) !== -1);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  准备听牌列表 - 不同麻将, 不同处理
    //
    //  prepareYunChengTingPais:                运城贴金
    //  prepareTuidaohuTingPais:                推倒胡
    //  prepareQinshuiTingPais:                 沁水麻将
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 准备听牌列表（运城贴金）
     *
     * @param player: 玩家信息
     * @param jin_pais: 金牌
     * @param begin: 开始牌（包括）
     * @param end: 结束牌（包括）
     */
    this.prepareYunChengTingPais = function(player, jin_pais, begin, end) {
        this.prepareLaiziTingPais(player, jin_pais, begin, end);
    };

    /**
     * 准备听牌列表（推倒胡）
     *
     * @param player: 玩家信息
     * @param begin: 开始牌（包括）
     * @param end: 结束牌（包括）
     */
    this.prepareTuidaohuTingPais = function(player, begin, end) {
        this.prepareNormalTingPais(player, begin, end);
    };

    /**
     * 准备听牌列表（沁水麻将）
     *
     * @param player: 玩家信息
     * @param jin_pais: 金牌
     * @param begin: 开始牌（包括）
     * @param end: 结束牌（包括）
     */
    this.prepareQinshuiTingPais = function(player, jin_pais, begin, end) {
        this.prepareLaiziTingPais(player, jin_pais, begin, end);
    };

    /**
     * 准备听牌列表(长春麻将)
     * @param player: 玩家信息
     * @param begin: 开始牌（包括）
     * @param end: 结束牌（包括）
     */
    this.prepareChangchunTingPais = function(player, begin, end, isQueMen) {
        this.prepareChangchunNormalTingPais(player, begin, end, isQueMen);
    };
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  分支处理（准备听牌列表）
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 准备听牌列表（赖子麻将）
     *
     * @param player: 玩家信息
     * @param jin_pais: 金牌
     * @param begin: 开始牌（包括）
     * @param end: 结束牌（包括）
     */
    this.prepareLaiziTingPais = function(player, jin_pais, begin, end) {
        // 计算金牌个数
        var jin_count = 0, count_map = {};
        var i;
        for (i = 0; i < jin_pais.length; i++) {
            var jin_pai = jin_pais[i];
            jin_count += player.count_map[jin_pai];

            // 临时保存
            count_map[jin_pai] = player.count_map[jin_pai];

            // 清零金牌数量
            player.count_map[jin_pai] = 0;
        }

        for (var pai = begin; pai <= end; pai ++) {
            // 添加试试看
            player.count_map[pai] ++;

            var hu_pattern, can_hu;
            if (this.isQiDui(player.count_map, jin_pais, jin_count)) {
                hu_pattern = this.HU_PATTERN.QIDUI;
                can_hu = true;
            } else {
                can_hu = this.canHuWithoutLaizi(player.count_map);
                if (can_hu) {
                    hu_pattern = this.HU_PATTERN.PINGHU;
                }
            }

            if (can_hu) {
                player.ting_map[pai] = {
                    fan: 1,
                    hu_pattern: hu_pattern
                };
            }

            player.count_map[pai] --;
        }

        // 复位
        for (i = 0; i < jin_pais.length; i++) {
            player.count_map[jin_pais[i]] = count_map[jin_pais[i]];
        }
    };

    /**
     * 准备听牌列表（普通麻将）
     *
     * @param player: 玩家信息
     * @param begin: 开始牌（包括）
     * @param end: 结束牌（包括）
     */
    this.prepareNormalTingPais = function(player, begin, end) {
        for (var pai = begin; pai <= end; pai ++) {
            // 添加试试看
            player.count_map[pai] ++;

            var hu_pattern, can_hu;
            if (this.isQiDui(player.count_map, [], 0)) {
                hu_pattern = this.HU_PATTERN.QIDUI;
                can_hu = true;
            } else if (this.isShiSanYao(player.count_map, [], 0)) {
                hu_pattern = this.HU_PATTERN.SHISANYAO;
                can_hu = true;
            } else {
                can_hu = this.canHuWithoutLaizi(player.count_map);
                if (can_hu) {
                    hu_pattern = this.HU_PATTERN.PINGHU;
                }
            }

            if (can_hu) {
                player.ting_map[pai] = {
                    fan: 1,
                    hu_pattern: hu_pattern
                };
            }

            player.count_map[pai] --;
        }
    };

    /**
     * 长春麻将，准备听牌列表
     * @param player
     * @param begin
     * @param end
     * @param isQueMen
     */
    this.prepareChangchunNormalTingPais = function(player, begin, end, isQueMen) {
        for (var pai = begin; pai <= end; pai ++) {
            // 添加试试看
            player.count_map[pai] ++;

            if(isQueMen === false) {
                if(this.checkBuQueMen(player) === false) {
                    player.count_map[pai] --;
                    continue;
                }
            }
            if(this.checkBuQueYaoJiu(player) === false) {
                player.count_map[pai] --;
                continue;
            }

            /*if(this.checkBuQueDaCha(player) === false) {
                player.count_map[pai] --;
                continue;
            }*/

            var hu_pattern, can_hu;
            var fan;
            if (this.isQiDui(player.count_map, [], 0)) {
                hu_pattern = this.HU_PATTERN.QIDUI;
                can_hu = true;
            } else {
                var hu_type = this.canChangChunHuWithoutLaizi(player, pai);
                if (hu_type === 2) {
                    hu_pattern = this.HU_PATTERN.JIAHU;
                    fan = 2;
                    can_hu = true;
                } else if(hu_type === 3) {
                    hu_pattern = this.HU_PATTERN.PIAOHU;
                    fan = 4;
                    can_hu = true;
                } else if(hu_type === 1) {
                    hu_pattern = this.HU_PATTERN.PINGHU;
                    fan = 1;
                    can_hu = true;
                } else {
                    can_hu = false;
                }
            }

            if (can_hu) {
                player.ting_map[pai] = {
                    fan: fan,
                    hu_pattern: hu_pattern
                };
            }

            player.count_map[pai] --;
        }
    };

    /**
     * 查看不能缺门
     * 手牌中有 万，条，筒 都有的话 true，没有一个 false
     * @param player: 玩家信息
     */
    this.checkBuQueMen = function(player)
    {
        if(this.checkMen(player, 0, 9) === false)
            return false;
        if(this.checkMen(player, 9, 18) === false)
            return false;
        if(this.checkMen(player, 18, 27) === false)
            return false;

        return true;
    };

    this.checkMen = function(player, start, end) {
        var i, j;
        var pais, pai;

        //检查剩下的手牌中有没有该门牌,如果有马上返回true，没有继续检查 吃，碰，杠牌
        for(i = start; i < end; i++) {
            if(player.count_map[i] > 0) {
                return true;
            }
        }

        for(i = 0; i < player.chis.length; i++) {
            pais = player.chis[i];
            for(j = 0; j < pais.length; j++) {
                if(start < pais[j] && pais[j] < end)
                    return true;
            }
        }
        for(i = 0; i < player.pengs.length; i++) {
            pai = player.pengs[i];
            if(start < pai && pai < end)
                return true;
        }
        for(i = 0; i < player.an_gangs.length; i++) {
            pai = player.an_gangs[i];
            if(start < pai && pai < end)
                return true;
        }
        for(i = 0; i < player.ming_gangs.length; i++) {
            pai = player.ming_gangs[i];
            if(start < pai && pai < end)
                return true;
        }
        for(i = 0; i < player.peng_gangs.length; i++) {
            pai = player.peng_gangs[i];
            if(start < pai && pai < end)
                return true;
        }

        // 只是幺杠和九杠算色，其他特殊杠都不算色
        if(player.yao_gangs.length > 0)
            return true;
        if(player.jiu_gangs.length > 0)
            return true;

        return false;
    };
    /**
     * 查看却幺九，风牌和字牌顶幺九
     * @param player: 玩家信息
     */
    this.checkBuQueYaoJiu = function(player)
    {
        var i, j;
        var pais, pai;
        if(player.count_map[0] > 0 || player.count_map[8] > 0 || player.count_map[9] > 0 ||
            player.count_map[17] > 0 || player.count_map[18] > 0 || player.count_map[26] > 0) {
            return true;
        }

        //风字牌顶替幺九
        var check_flag = false;
        for(var i = 27; i < 34; i++) {
            if(player.count_map[i] > 0) {
                check_flag = true;
                break;
            }
        }

        for(i = 0; i < player.chis.length; i++) {
            pais = player.chis[i];
            for(j = 0; j < pais.length; j++) {
                if(this.isYaoPai(pais[j]) === true || this.isJiuPai(pais[j]) === true)
                    return true;
            }
        }
        for(i = 0; i < player.pengs.length; i++) {
            pai = player.pengs[i];
            if(this.isYaoPai(pai) === true || this.isJiuPai(pai) === true)
                return true;
        }
        for(i = 0; i < player.an_gangs.length; i++) {
            pai = player.an_gangs[i];
            if(this.isYaoPai(pai) === true || this.isJiuPai(pai) === true)
                return true;
        }
        for(i = 0; i < player.ming_gangs.length; i++) {
            pai = player.ming_gangs[i];
            if(this.isYaoPai(pai) === true || this.isJiuPai(pai) === true)
                return true;
        }
        for(i = 0; i < player.peng_gangs.length; i++) {
            pai = player.peng_gangs[i];
            if(this.isYaoPai(pai) === true || this.isJiuPai(pai) === true)
                return true;
        }

        if(player.xuanfeng_gangs.length > 0 || player.xi_gangs.length > 0 || player.yao_gangs.length > 0 || player.jiu_gangs.length > 0)
            return true;
        return false;
    };

    /**
     * 查看是不是缺碰，如果不缺碰返回 true，缺碰返回 false
     * @param player
     */
    this.checkBuQueDaCha = function(player) {
        if(player.ming_gangs.length > 0 || player.an_gangs.length > 0 || player.peng_gangs.length > 0 || player.xuanfeng_gangs.length > 0 ||
            player.xi_gangs.length > 0 || player.yao_gangs.length > 0 || player.jiu_gangs.length > 0 || player.pengs.length > 0)
            return true;
        return false;
    };
    /**
     * 查看到现在都是 飘~
     */
    this.checkPiao = function(player) {
        if(player.chis.length > 0) {
            return false;
        }
        return true;
    };
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  有赖子分支
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 判断是否可以胡牌（金牌）
     *
     * @param count_map: 手牌
     * @param jin_count: 金牌数量
     */
    this.canHuWithLaizi = function(count_map, jin_count) {
        for (var i = 0; i < 5; i++) {
            var need_count = 0;
            for (var j = 0; j < 5; j++) {
                need_count += (i === j) ? this.getNeedCount(count_map, j, false) : this.getNeedCount(count_map, j, true);
            }

            if (need_count <= jin_count) {
                return true;
            }
        }

        return false;
    };

    /**
     * 消除整个组（万、筒、条、中、风）所需的特殊牌数量
     *
     * @param old_count_map: 手牌
     * @param type: 麻将牌类型
     * @param has_jiang: 是否已经有将牌
     */
    this.getNeedCount = function(old_count_map, type, has_jiang) {
        var data = {
            need_count: 0,
            has_jiang: has_jiang
        };

        var count_map = UTIL.simple_clone(old_count_map);

        var i, j;

        switch (type) {
            case 0: i = 0; j = 8; break;
            case 1: i = 9; j = 17; break;
            case 2: i = 18; j = 26; break;
            case 3: i = 27; j = 29; break;
            case 4: i = 30; j = 33; break;
        }
        data = this.dfs(count_map, i, j, data);

        return data.need_count;
    };

    /**
     * 获取所需特殊票更少的Data
     *
     * @param data1
     * @param data2
     * @returns {*}
     */
    this.getMinData = function(data1, data2) {
        return data1.need_count > data2.need_count ? data2 : data1;
    };

    /**
     * DFS
     *
     * @param count_map: 手牌
     * @param i: 开始
     * @param j: 结束
     * @param data: Data
     * @returns {*}
     */
    this.dfs = function(count_map, i, j, data) {
        if (i > j) {
            if (! data.has_jiang) {
                data.need_count += 2;
            }

            return data;
        }

        if (i % 9 === 6 && i < 27 && count_map[i + 1] === 1 && count_map[i + 2] === 1) {
            return this.delList(count_map, i, j, data);
        }

        if (count_map[i] === 0) {
            return this.dfs(count_map, i + 1, j, data);
        }

        var tmp1, tmp2;
        if (i % 9 < 7 && i < 27 && (count_map[i + 1] > 0 || count_map[i + 2] > 0)) {
            tmp1 = this.delList(count_map, i, j, {
                need_count: data.need_count,
                has_jiang: data.has_jiang
            });

            tmp2 = this.delSame(count_map, i, j, {
                need_count: data.need_count,
                has_jiang: data.has_jiang
            });

            return this.getMinData(tmp1, tmp2);
        }

        if (i < 27) {
            return this.delSame(count_map, i, j, data);
        } else if (i <= 29) {
            // 中, 发, 白
            /*var tmp1 = this.delRedList(count_map, i, j, {
                need_count: data.need_count,
                has_jiang: data.has_jiang
            });*/
            tmp2 = this.delSame(count_map, i, j, {
                need_count: data.need_count,
                has_jiang: data.has_jiang
            });

            //return this.getMinData(tmp1, tmp2);
            return tmp2;
        } else if (i <= 33) {
            var res = null;
            /*for (var ii = 30; ii < 33; ii++) {
                for (var jj = ii + 1; jj <= 33; jj++) {
                    if (ii == i || jj == i) {
                        continue;
                    }

                    // i, ii, jj三个可以组成一个连子
                    if (count_map[ii] > 0 || count_map[jj] > 0) {
                        var tmp = this.delWindList(count_map, i, j, {
                            need_count: data.need_count,
                            has_jiang: data.has_jiang
                        }, [i, ii, jj]);

                        if (res == null) {
                            res = tmp;
                        } else {
                            res = this.getMinData(res, tmp);
                        }
                    }
                }
            }*/

            tmp2 = this.delSame(count_map, i, j, {
                need_count: data.need_count,
                has_jiang: data.has_jiang
            });

            if (res == null) {
                res = tmp2;
            } else {
                res = this.getMinData(res, tmp2);
            }

            return res;
        }
    };

    /**
     * 消除连牌
     *
     * @param old_count_map: 手牌
     * @param i: 开始
     * @param j: 结束
     * @param data: Data
     * @returns {*}
     */
    this.delList = function(old_count_map, i, j, data) {
        var count_map = UTIL.simple_clone(old_count_map);

        for (var k = 0; k < 3; k++) {
            if (count_map[i + k] > 0) {
                count_map[i + k] --;
            } else {
                data.need_count ++;
            }
        }

        return this.dfs(count_map, i, j, data);
    };

    /**
     * 消除同牌
     *
     * @param old_count_map: 手牌
     * @param i: 开始
     * @param j: 结束
     * @param data: Data
     * @returns {*}
     */
    this.delSame = function(old_count_map, i, j, data) {
        var count_map = UTIL.simple_clone(old_count_map);

        count_map[i] %= 3;
        switch (count_map[i]) {
            case 0:
                break;
            case 1:
                if (data.has_jiang) {
                    data.need_count += 2;
                } else {
                    data.need_count ++;
                    data.has_jiang = true;
                }
                break;
            case 2:
                if (data.has_jiang) {
                    data.need_count += 1;
                } else {
                    data.has_jiang = true;
                }
                break;
        }
        count_map[i] = 0;

        return this.dfs(count_map, i + 1, j, data);
    };

    /**
     * 排序
     *
     */
    this.sort = function(holds, laizi_pais) {
        // 赖子牌放到最左边, 其他从小到大排序
        for (var i = 0; i < holds.length - 1; i++) {
            for (var j = i + 1; j < holds.length; j++) {
                if (this.weight(holds[i], laizi_pais) > this.weight(holds[j], laizi_pais)) {
                    var tmp = holds[i];
                    holds[i] = holds[j];
                    holds[j] = tmp;
                }
            }
        }
    };

    /**
     * 指定牌的权值(排序用到)
     *
     * @param pai
     * @param laizi_pais
     */
    this.weight = function(pai, laizi_pais) {
        var is_laizi = laizi_pais.indexOf(pai);
        if (is_laizi !== -1) {
            return -1000 + pai;
        } else {
            return pai;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  无赖子分支
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * 是否可以胡
     *
     * @param player
     * @param count_map
     * @returns {boolean}
     */
    this.canChangChunHuWithoutLaizi = function(player, hupai) {
        var count_map = player.count_map;
        for (var k in count_map) {
            this.hu_map = [];
            if (! count_map.hasOwnProperty(k)) {
                continue;
            }

            k = parseInt(k);
            var c = count_map[k];
            if (c < 2) {
                continue;
            }

            // 如果当前牌大于等于２，则将它选为将牌
            count_map[k] -= 2;
            this.hu_map.push({pattern:"duizi",
                        pai:k
                        });
            // 逐个判定剩下的牌是否满足　３Ｎ规则, 一个牌会有以下几种情况
            //1、0张，则不做任何处理
            //2、2张，则只可能是与其它牌形成匹配关系
            //3、3张，则可能是单张形成 A-2,A-1,A  A-1,A,A+1  A,A+1,A+2，也可能是直接成为一坎
            //4、4张，则只可能是一坎+单张

            // 默认为飘胡，如果不是飘胡，piaohuFlag 等于 false
            this.piaohuFlag = true;
            var ret = this.checkSingle(count_map, this.hu_map);
            count_map[k] += 2;
            if (ret) {
                var has_cha = false;
                for(var i = 0; i < this.hu_map.length; i++) {
                    if(this.hu_map[i].pattern === "peng") {
                        has_cha = true;
                        break;
                    }
                }
                if(this.checkBuQueDaCha(player) === false && has_cha === false) {
                    return 0;
                }

                if(hupai != k && hupai > 0 && hupai < 26 && count_map[hupai - 1] > 0 && count_map[hupai + 1] > 0)
                    return 2;  // 夹胡
                if(this.piaohuFlag === true)
                    return 3;  // 飘胡
                return 1;   // 平胡
            }
        }
        return 0;
    };
    /**
     * 是否可以平胡
     *
     * @param count_map
     * @returns {boolean}
     */
    this.canHuWithoutLaizi = function(count_map) {
        for (var k in count_map) {
            if (! count_map.hasOwnProperty(k)) {
                continue;
            }

            k = parseInt(k);
            var c = count_map[k];
            if (c < 2) {
                continue;
            }

            // 如果当前牌大于等于２，则将它选为将牌
            count_map[k] -= 2;
            // 逐个判定剩下的牌是否满足　３Ｎ规则, 一个牌会有以下几种情况
            //1、0张，则不做任何处理
            //2、2张，则只可能是与其它牌形成匹配关系
            //3、3张，则可能是单张形成 A-2,A-1,A  A-1,A,A+1  A,A+1,A+2，也可能是直接成为一坎
            //4、4张，则只可能是一坎+单张
            var ret = this.checkSingle(count_map);
            count_map[k] += 2;
            if (ret) {
                return true;
            }
        }
        return false;
    };

    /**
     * 判断指定牌型是否为M*111 + N*123。
     *      checkSingle = (checkSingle - 111) + (matchSingle - 123)。
     *
     * @param count_map
     * @param hu_map
     * @returns {*}
     */
    this.checkSingle = function(count_map, hu_map) {
        var selected = -1;
        var c;
        var ret;

        for (var pai in count_map) {
            if (! count_map.hasOwnProperty(pai)) {
                continue;
            }

            pai = parseInt(pai);
            c = count_map[pai];
            if (c !== 0) {
                selected = pai;
                break;
            }
        }
        // 如果没有找到剩余牌，则表示匹配成功了
        if (selected === -1) {
            return true;
        }

        // 否则，进行匹配
        if (c === 3) {
            // 直接作为一坎
            count_map[selected] = 0;
            this.hu_map.push({
                pattern: "peng",
                pai: selected
            });
            ret = this.checkSingle(count_map, hu_map);
            // 立即恢复对数据的修改
            count_map[selected] = c;
            if (ret === true) {
                return true;
            }
        } else if(c === 4) {
            // 直接作为一坎
            count_map[selected] = 1;
            this.hu_map.push({
                pattern: "peng",
                pai: selected
            });
            ret = this.checkSingle(count_map, hu_map);
            // 立即恢复对数据的修改
            count_map[selected] = c;
            // 如果作为一坎能够把牌匹配完，直接返回TRUE。
            if (ret === true) {
                return true;
            }
        }

        this.piaohuFlag = false;

        if (selected < 27) {
            // 按单牌处理
            return this.matchSingle(count_map, selected);
        }
        /*if (selected < 30) {
            // 按单牌处理
            return this.matchSingle(count_map, selected);
        } else {
            // 【东南西北】单独处理。
            return this.matchSingleWind(count_map, selected);
        }*/
    };

    /**
     * 匹配一个123，然后将它从牌型中删除，再试试checkSingle看。
     *
     * @param count_map
     * @param selected
     * @returns {boolean}
     */
    this.matchSingle = function(count_map, selected) {
        // 分开匹配 A-2,A-1,A
        var matched = true;
        var v = selected % 9;
        var i, t, cc, ret;

        if (v < 2) {
            matched = false;
        } else {
            for (i = 0; i < 3; ++i) {
                t = selected - 2 + i;
                cc = count_map[t];

                if (cc == null || cc === 0) {
                    matched = false;
                    break;
                }
            }
        }

        // 匹配成功，扣除相应数值
        if (matched) {
            count_map[selected - 2] --;
            count_map[selected - 1] --;
            count_map[selected] --;

            ret = this.checkSingle(count_map);

            count_map[selected - 2] ++;
            count_map[selected - 1] ++;
            count_map[selected] ++;

            if (ret === true) {
                return true;
            }
        }

        // 分开匹配 A-1,A,A + 1
        matched = true;
        if (v < 1 || v > 7 || selected >= 29) {
            matched = false;
        } else {
            for (i = 0; i < 3; ++i) {
                t = selected - 1 + i;
                cc = count_map[t];

                if (cc == null) {
                    matched = false;
                    break;
                }

                if (cc === 0) {
                    matched = false;
                    break;
                }
            }
        }

        // 匹配成功，扣除相应数值
        if (matched) {
            count_map[selected - 1] --;
            count_map[selected] --;
            count_map[selected + 1] --;
            ret = this.checkSingle(count_map);
            count_map[selected - 1] ++;
            count_map[selected] ++;
            count_map[selected + 1] ++;
            if (ret === true) {
                return true;
            }
        }


        // 分开匹配 A,A+1,A + 2
        matched = true;
        if (v > 6 || selected >= 28) {
            matched = false;
        } else {
            for (i = 0; i < 3; ++i) {
                t = selected + i;
                cc = count_map[t];

                if (cc == null) {
                    matched = false;
                    break;
                }

                if (cc === 0) {
                    matched = false;
                    break;
                }
            }
        }

        // 匹配成功，扣除相应数值
        if (matched) {
            count_map[selected] --;
            count_map[selected + 1] --;
            count_map[selected + 2] --;

            ret = this.checkSingle(count_map);

            count_map[selected] ++;
            count_map[selected + 1] ++;
            count_map[selected + 2] ++;
            if (ret === true) {
                return true;
            }
        }

        return false;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  特殊牌型判断相关
    //
    //  isQiDui:                是否七对
    //  isHaohuaQiDui:          是否豪华七小对
    //  isShiSanYao:            是否十三幺
    //  isQingYiSe:             是否清一色
    //  isYiTiaoLong:           是否一条龙
    //
    //  getFlower:              获取牌的花色
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 是否七对
     *
     * @param count_map:    手牌
     * @param jin_pais:     金牌数组
     * @param jin_count:    金牌数量
     * @returns {boolean}
     */
    this.isQiDui = function(count_map, jin_pais, jin_count) {
        var pair_count = 0;
        for (var pai in count_map) {
            if (! count_map.hasOwnProperty(pai)) {
                continue;
            }

            pai = parseInt(pai);
            if (this.isJinPai(jin_pais, pai)) {
                continue;
            }

            var count = count_map[pai];
            if (count === 4) {
                pair_count += 2;
            } else if (count >= 2) {
                pair_count ++;
            }
        }

        return (pair_count + jin_count >= 7);
    };

    /**
     * 是否豪华七小对
     *
     * @param count_map:    手牌
     * @param jin_count:    金牌数量
     * @returns {boolean}
     */
    this.isHaohuaQiDui = function(count_map, jin_count) {
        for (var pai in count_map) {
            if (! count_map.hasOwnProperty(pai)) {
                continue;
            }

            if (count_map[pai] + jin_count >= 4) {
                return true;
            }
        }

        return false;
    };

    /**
     * 是否十三幺
     *
     * @param count_map:    手牌
     * @param jin_pais:     金牌数组
     * @param jin_count:    金牌数量
     * @returns {boolean}
     */
    this.isShiSanYao = function(count_map, jin_pais, jin_count) {
        // 东南西北, 中发白, 191919
        var pais = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
        var found = false, count = 0;
        for (var i = 0; i < pais.length; i++) {
            var pai = pais[i];

            if (count_map[pai] === 2 && ! found) {
                found = true;
                count += 2;
            } else if (count_map[pai] === 1) {
                count ++;
            }
        }
        return (count + jin_count === 14);
    };

    /**
     * 是否清一色
     *
     * @param player:       玩家信息
     * @param jin_pais:     金牌数组
     * @returns {boolean}
     */
    this.isQingYiSe = function(player, jin_pais) {
        var flower = -1;

        var i, pai;
        // 手牌
        for (var k in player.count_map) {
            if (! player.count_map.hasOwnProperty(k)) {
                continue;
            }

            k = parseInt(k);
            if (player.count_map[k] === 0) {
                continue;
            }

            if (this.isJinPai(jin_pais, k)) {
                continue;
            }

            if (flower === -1) {
                flower = this.getFlower(k);
            } else {
                if (this.getFlower(k) !== flower) {
                    return false;
                }
            }
        }

        // 明杠
        for (i = 0; i < player.ming_gangs.length; i++) {
            pai = player.ming_gangs[i];

            if (flower === -1) {
                flower = this.getFlower(pai);
            } else {
                if (this.getFlower(pai) !== flower) {
                    return false;
                }
            }
        }
        // 暗杠
        for (i = 0; i < player.an_gangs.length; i++) {
            pai = player.an_gangs[i];

            if (flower === -1) {
                flower = this.getFlower(pai);
            } else {
                if (this.getFlower(pai) !== flower) {
                    return false;
                }
            }
        }
        // 碰杠
        for (i = 0; i < player.peng_gangs.length; i++) {
            pai = player.peng_gangs[i];

            if (flower === -1) {
                flower = this.getFlower(pai);
            } else {
                if (this.getFlower(pai) !== flower) {
                    return false;
                }
            }
        }
        // 碰
        for (i = 0; i < player.pengs.length; i++) {
            pai = player.pengs[i];

            if (flower === -1) {
                flower = this.getFlower(pai);
            } else {
                if (this.getFlower(pai) !== flower) {
                    return false;
                }
            }
        }

        return true;
    };

    /**
     * 是否一条龙
     *
     * @param player:       玩家信息
     * @param jin_pais:     金牌数组
     * @param jin_count:    金牌数量
     */
    this.isYiTiaoLong = function(player, jin_pais, jin_count) {
        var self = this;
        var scan = function(type) {
            var numbers = [];
            var i, pai, index;

            for (i = 0; i < 9; i++) {
                numbers.push(i + type * 9);
            }

            // 明杠
            for (i = 0; i < player.ming_gangs.length; i++) {
                pai = player.ming_gangs[i];
                index = numbers.indexOf(pai);
                if (index !== -1) {
                    numbers.splice(index, 1);
                }
            }
            // 暗杠
            for (i = 0; i < player.an_gangs.length; i++) {
                pai = player.an_gangs[i];
                index = numbers.indexOf(pai);
                if (index !== -1) {
                    numbers.splice(index, 1);
                }
            }
            // 碰杠
            for (i = 0; i < player.peng_gangs.length; i++) {
                pai = player.peng_gangs[i];
                index = numbers.indexOf(pai);
                if (index !== -1) {
                    numbers.splice(index, 1);
                }
            }
            // 碰
            for (i = 0; i < player.pengs.length; i++) {
                pai = player.pengs[i];
                index = numbers.indexOf(pai);
                if (index !== -1) {
                    numbers.splice(index, 1);
                }
            }

            // 剩下的从手牌中查找
            var count = 0;
            for (i = 0; i < numbers.length; i++) {
                pai = numbers[i];

                if (player.count_map[pai] > 0) {
                    count ++;
                }
            }

            // 相同牌的数量是否齐全
            if (count + jin_count < numbers.length) {
                return false;
            }

            // 数量齐全, 从手牌中去掉, 检查是否可以胡牌
            var count_map = JSON.stringify(player.count_map);
            var old_jin_count = jin_count;
            for (i = 0; i < numbers.length; i++) {
                pai = numbers[i];
                if (player.count_map[pai] > 0) {
                    player.count_map[pai] --;
                } else {
                    jin_count --;
                }
            }
            // 清零金牌个数
            for (i = 0; i < jin_pais.length; i++) {
                player.count_map[jin_pais[i]] = 0;
            }

            var can_hu = false;
            if (jin_count >= 1) {
                can_hu = self.canHuWithLaizi(player.count_map, jin_count);
            } else {
                can_hu = self.canHuWithoutLaizi(player.count_map);
            }

            jin_count = old_jin_count;
            player.count_map = JSON.parse(count_map);

            return can_hu;
        };

        // 万条筒顺序依次扫描
        for (var i = 0; i < 3; i ++) {
            var result = scan(i);

            if (result) {
                return true;
            }
        }

        return false;
    };

    /**
     * 获取牌的花色
     *
     * @param pai
     */
    this.getFlower = function(pai) {
        if (pai >= 0 && pai <= 8) {
            // 万
            return 0;
        }

        if (pai >= 9 && pai <= 17) {
            // 条
            return 1;
        }

        if (pai >= 18 && pai <= 26) {
            // 筒
            return 2;
        }

        if (pai >= 27 && pai <= 29) {
            // 中发白
            return 3;
        }

        if (pai >= 30 && pai <= 33) {
            // 东南西北
            return 4;
        }

        return -1;
    }

    /**
     * 长春麻将积分部分
     *
     *
     */
};

module.exports = new MahjongUtil();