/**
 * Created by leo on 4/26/2018.
 */

var PokerUtil = function() {
    var WEIGHT = {
        ROCKET: 5000,                                                                                                   //  火箭
        BOMB: 2000,                                                                                                     //  炸弹

        FOUR_WITH_TWO_PAIR: 1300,                                                                                       //  4带2个双牌
        FOUR_WITH_TWO_SINGLE: 1200,                                                                                     //  4带2个单牌
        //TRIPLE_WITH_TWO_PAIR: 1100,                                                                                     //  3带2个双牌
        //TRIPLE_WITH_TWO_SINGLE: 1000,                                                                                   //  3带2个单牌
        PLANE_WITH_WING_PAIR: 900,                                                                                      //  飞机带双牌翅膀
        PLANE_WITH_WING_SINGLE: 800,                                                                                    //  飞机带单牌翅膀
        TRIPLE_STRAIGHT: 700,                                                                                           //  三顺
        PAIR_STRAIGHT: 600,                                                                                             //  双顺
        STRAIGHT: 500,                                                                                                  //  单顺
        TRIPLE_WITH_PAIR: 400,                                                                                          //  三带一对子
        TRIPLE_WITH_SINGLE: 300,                                                                                        //  三带一单牌
        TRIPLE: 200,                                                                                                    //  三同
        PAIR: 100,                                                                                                      //  对子
        SINGLE: 10,                                                                                                     //  单牌
        NONE: 0                                                                                                         //  无
    };

    this.POKER = {
        RED_JOKER: 53,
        BLACK_JOKER: 52
    };

    this.FLOWER = {
        SPADE: 0,
        HEART: 1,
        CLUB: 2,
        DIAMOND: 3
    };

    this.PATTERN_NAME = {
        ROCKET: 'rocket',
        BOMB: 'bomb',

        FOUR_WITH_TWO_SINGLE: 'four_with_two_single',                                                                   //  4带2个单牌
        FOUR_WITH_TWO_PAIR: 'four_with_two_pair',                                                                       //  4带2个双牌
        //TRIPLE_WITH_TWO_SINGLE: 'triple_with_two_single',                                                               //  3带2个单牌
        //TRIPLE_WITH_TWO_PAIR: 'triple_with_two_pair',                                                                   //  3带2个双牌
        PLANE_WITH_WING_SINGLE: 'plane_with_wing_single',                                                               //  飞机带单牌翅膀
        PLANE_WITH_WING_PAIR: 'plane_with_wing_pair',                                                                   //  飞机带双牌翅膀
        TRIPLE_STRAIGHT: 'triple_straight',                                                                             //  三顺
        PAIR_STRAIGHT: 'pair_straight',                                                                                 //  双顺
        STRAIGHT: 'straight',                                                                                           //  单顺
        TRIPLE_WITH_SINGLE: 'triple_with_single',                                                                       //  3带单牌
        TRIPLE_WITH_PAIR: 'triple_with_pair',                                                                           //  3带双牌
        TRIPLE: 'triple',                                                                                               //  3同
        PAIR: 'pair',                                                                                                   //  对子
        SINGLE: 'single',                                                                                               //  单牌
        NONE: 'none'
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  公用工具
    //
    //  flower:                 牌的花色(大小王: null)
    //  number:                 牌的字面(A: 0, 2: 1, 3: 2, ..., K: 12, 小王: 52, 大王: 53)
    //  weightedNumber:         牌的字面(A: 13, 2: 14, 3: 2, 4: 3, ..., K: 12, 小王: 52, 大王: 53)
    //  countMap:               字面的数目(laizi不计算)
    //  laiziCount:             获取赖子数量
    //  isLaizi:                指定扑克是否赖子
    //  sortByWeightedNumber:   根据字面大小排序牌组
    //  sortPokersWithLaizi:    排序扑克牌(考虑赖子)
    //  getPokerCount:          根据count_map, laizi获取牌数目
    //
    //  isStraightWithLength:   是否顺子
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 牌的花色(大小王: null)
     *
     * @param poker
     * @returns {*}
     */
    this.flower = function(poker) {
        if (poker >= 0 && poker <= 12) {
            return this.FLOWER.SPADE;
        }

        if (poker >= 13 && poker <= 25) {
            return this.FLOWER.HEART;
        }

        if (poker >= 26 && poker <= 38) {
            return this.FLOWER.CLUB;
        }

        if (poker >= 39 && poker <= 51) {
            return this.FLOWER.DIAMOND;
        }

        return null;
    };

    /**
     * 牌的字面(A: 0, 2: 1, 3: 2, ..., K: 12, 小王: 52, 大王: 53)
     *
     * @param poker
     * @returns {*}
     */
    this.number = function (poker) {
        if (poker === this.POKER.RED_JOKER || poker === this.POKER.BLACK_JOKER) {
            return poker;
        }

        return poker % 13;
    };

    /**
     * 牌的字面(A: 13, 2: 14, 3: 2, 4: 3, ..., K: 12, 小王: 52, 大王: 53)
     *
     * @param poker
     * @returns {*}
     */
    this.weightedNumber = function(poker) {
        if (poker === this.POKER.RED_JOKER || poker === this.POKER.BLACK_JOKER) {
            return poker;
        }

        if (poker % 13 === 0) {
            // A
            return 13;
        }

        if (poker % 13 === 1) {
            // 2
            return 14;
        }

        return poker % 13;
    };

    /**
     * 字面的数目(laizi不计算)
     *
     * @param pokers
     * @param laizi
     * @returns {{}}
     */
    this.countMap = function(pokers, laizi) {
        var count_map = {};

        for (var i = 0; i < pokers.length; i++) {
            var poker = pokers[i];
            var number = this.weightedNumber(poker);

            // 赖子不要计数
            if (number === this.weightedNumber(laizi)) {
                continue;
            }

            if (! count_map[number]) {
                count_map[number] = 0;
            }

            count_map[number] ++;
        }

        return count_map;
    };

    /**
     * 获取赖子数量
     *
     * @param pokers
     * @param laizi
     * @returns {number}
     */
    this.laiziCount = function(pokers, laizi) {
        var count = 0;
        for (var i = 0; i < pokers.length; i++) {
            if (this.isLaizi(pokers[i], laizi)) {
                count ++;
            }
        }

        return count;
    };

    /**
     * 指定扑克是否赖子
     *
     * @param poker
     * @param laizi
     */
    this.isLaizi = function(poker, laizi) {
        if (laizi === -1) {
            return false;
        }

        return (this.weightedNumber(poker) === this.weightedNumber(laizi));
    };

    /**
     * 根据字面大小升序排序牌组
     *
     * @param pokers
     * @returns {*}
     */
    this.sortByWeightedNumber = function(pokers) {
        for (var i = 0; i < pokers.length - 1; i++) {
            for (var j = i + 1; j < pokers.length; j++) {
                if (this.weightedNumber(pokers[i]) > this.weightedNumber(pokers[j])) {
                    var tmp = pokers[i];
                    pokers[i] = pokers[j];
                    pokers[j] = tmp;
                }
            }
        }

        return pokers;
    };

    /**
     * 降序排序扑克牌(考虑赖子)
     *
     * @param pokers
     * @param laizi
     */
    this.sortPokersWithLaizi = function(pokers, laizi) {
        var self = this;
        var weight = function (poker) {
            // 赖子权值最大
            var weightedNumber = self.weightedNumber(poker);
            if (weightedNumber === self.weightedNumber(laizi)) {
                return 1000;
            }

            // 其他牌按大小赋权值
            return weightedNumber;
        };

        for (var i = 0; i < pokers.length - 1; i++) {
            for (var j = i + 1; j < pokers.length; j++) {
                if ((weight(pokers[i]) < weight(pokers[j])) || (weight(pokers[i]) === weight(pokers[j]) && pokers[i] > pokers[j])) {
                    var tmp = pokers[i];
                    pokers[i] = pokers[j];
                    pokers[j] = tmp;
                }
            }
        }
    };

    /**
     * 根据count_map, laizi获取牌数目
     *
     * @param count_map
     * @param laizi_count
     */
    this.getPokerCount = function(count_map, laizi_count) {
        var poker_count = 0;
        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }

            if (count_map[poker] > 0) {
                poker_count += count_map[poker];
            }
        }

        return (poker_count + laizi_count);
    };

    /**
     * 是否顺子
     *
     * @param singles   字面数组(2 - 14)
     * @param laizi_count
     * @param straight_length
     * @returns {boolean}
     */
    this.isStraightWithLength = function(singles, laizi_count, straight_length) {
        if (singles.length + laizi_count !== straight_length) {
            return false;
        }

        singles = this.sortByWeightedNumber(singles);

        // 2不能当做顺子牌
        if (singles[singles.length - 1] === 14) {
            return false;
        }

        var start_poker = singles[0];
        for (var i = 0; i < straight_length; i++) {
            var poker = start_poker + i;
            if (singles.indexOf(poker) === -1) {
                laizi_count --;

                if (laizi_count < 0) {
                    return false;
                }
            }
        }

        return true;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  牌型判断
    //
    //  isRocket:               是否火箭
    //  isBomb:                 是否炸弹
    //  isFourWithTwoSingle     4带2个单牌
    //  isFourWithTwoPair       4带2个双牌
    //  isTripleWithTwoSingle   3带2个单牌
    //  isTripleWithTwoPair     3带2个双牌
    //  isPlaneWithWingSingle   飞机带单牌翅膀
    //  isPlaneWithWingPair     飞机带双牌翅膀
    //  isTripleStraight        三顺(至少2组)
    //  isPairStraight          双顺(至少3组)
    //  isStraight              单顺(至少5组)
    //  isTripleWithSingle      3带单牌
    //  isTripleWithPair        3带双牌
    //  isTriple                三同
    //  isPair                  双牌
    //  isSingle                单牌
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 是否火箭
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isRocket = function(count_map, laizi_count) {
        if (this.getPokerCount(count_map, laizi_count) !== 2) {
            return WEIGHT.NONE;
        }

        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }

            poker = parseInt(poker);

            if (poker !== this.POKER.RED_JOKER && poker !== this.POKER.BLACK_JOKER) {
                return WEIGHT.NONE;
            }
        }
        if (count_map[this.POKER.RED_JOKER] + count_map[this.POKER.BLACK_JOKER] === 2) {
            return WEIGHT.ROCKET;
        }

        return WEIGHT.NONE;
    };

    /**
     * 是否炸弹
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isBomb = function(count_map, laizi_count) {
        if (this.getPokerCount(count_map, laizi_count) !== 4) {
            return WEIGHT.NONE;
        }

        var seed_poker = -1;
        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }
            if (count_map[poker] === 0) {
                continue;
            }

            poker = parseInt(poker);

            if (count_map[poker] + laizi_count === 4) {
                seed_poker = poker;
            } else {
                return WEIGHT.NONE;
            }
        }
        if (seed_poker === -1) {
            // 说明四张都是赖子
            return WEIGHT.NONE;
        }

        return WEIGHT.BOMB + seed_poker;
    };

    /**
     * 4带2个单牌
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isFourWithTwoSingle = function(count_map, laizi_count) {
        var weight;
        var self = this;
        var func = function(count_map, single_count, laizi_count) {
            if (single_count < 0) {
                return WEIGHT.NONE;
            }

            if (single_count === 0) {
                // 边界条件: 去掉单牌就得炸弹
                weight = self.isBomb(count_map, laizi_count);

                if (weight >= WEIGHT.BOMB) {
                    weight += WEIGHT.FOUR_WITH_TWO_SINGLE - WEIGHT.BOMB;
                } else {
                    weight = WEIGHT.NONE;
                }

                return weight;
            }

            for (var poker in count_map) {
                if (! count_map.hasOwnProperty(poker)) {
                    continue;
                }
                poker = parseInt(poker);

                if (count_map[poker] >= 1) {
                    // 去掉一个单牌, 试试
                    count_map[poker] --;

                    weight = func(count_map, single_count - 1, laizi_count);

                    // 复位
                    count_map[poker] ++;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                }
            }

            // 没有单牌, 用赖子试试
            if (laizi_count <= 0) {
                return WEIGHT.NONE;
            }

            weight = func(count_map, single_count - 1, laizi_count - 1);

            return weight;
        };

        // 检查牌数
        if (this.getPokerCount(count_map, laizi_count) !== 6) {
            return WEIGHT.NONE;
        }

        return func(count_map, 2, laizi_count);
    };

    /**
     * 4带2个双牌
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isFourWithTwoPair = function(count_map, laizi_count) {
        var weight;
        var self = this;
        var func = function(count_map, pair_count, laizi_count) {
            if (pair_count < 0) {
                return WEIGHT.NONE;
            }

            if (pair_count === 0) {
                // 边界条件: 去掉双牌就得炸弹
                weight = self.isBomb(count_map, laizi_count);

                if (weight >= WEIGHT.BOMB) {
                    weight += WEIGHT.FOUR_WITH_TWO_PAIR - WEIGHT.BOMB;
                } else {
                    weight = WEIGHT.NONE;
                }

                return weight;
            }

            for (var poker in count_map) {
                if (! count_map.hasOwnProperty(poker)) {
                    continue;
                }
                poker = parseInt(poker);

                if (count_map[poker] >= 2) {
                    // 去掉一个双牌, 试试
                    count_map[poker] -= 2;

                    weight = func(count_map, pair_count - 1, laizi_count);

                    // 复位
                    count_map[poker] += 2;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                } else if (count_map[poker] >= 1) {
                    if (laizi_count <= 0) {
                        return WEIGHT.NONE;
                    }

                    // 去掉一个单牌 + 赖子, 试试
                    count_map[poker] --;

                    weight = func(count_map, pair_count - 1, laizi_count - 1);

                    // 复位
                    count_map[poker] ++;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                }
            }

            // 没有双牌, 用赖子试试
            if (laizi_count <= 1) {
                return WEIGHT.NONE;
            }

            weight = func(count_map, pair_count - 1, laizi_count - 2);

            return weight;
        };

        // 检查牌数
        if (this.getPokerCount(count_map, laizi_count) !== 8) {
            return WEIGHT.NONE;
        }

        return func(count_map, 2, laizi_count);
    };

    /**
     * 3带2个单牌
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     *
    this.isTripleWithTwoSingle = function(count_map, laizi_count) {
        var weight;
        var self = this;
        var func = function(count_map, single_count, laizi_count) {
            if (single_count < 0) {
                return WEIGHT.NONE;
            }

            if (single_count === 0) {
                // 边界条件: 去掉单牌就得3同牌
                weight = self.isTriple(count_map, laizi_count);

                if (weight >= WEIGHT.TRIPLE) {
                    weight += WEIGHT.TRIPLE_WITH_TWO_SINGLE - WEIGHT.TRIPLE;
                } else {
                    weight = WEIGHT.NONE;
                }

                return weight;
            }

            for (var poker in count_map) {
                if (! count_map.hasOwnProperty(poker)) {
                    continue;
                }
                poker = parseInt(poker);

                if (count_map[poker] >= 1) {
                    // 去掉一个单牌, 试试
                    count_map[poker] --;

                    weight = func(count_map, single_count - 1, laizi_count);

                    // 复位
                    count_map[poker] ++;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                }
            }

            // 没有单牌, 用赖子试试
            if (laizi_count <= 0) {
                return WEIGHT.NONE;
            }

            return func(count_map, single_count - 1, laizi_count - 1);
        };

        // 检查牌数
        if (this.getPokerCount(count_map, laizi_count) !== 5) {
            return WEIGHT.NONE;
        }

        return func(count_map, 2, laizi_count);
    };
    */

    /**
     * 3带2个双牌
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     *
    this.isTripleWithTwoPair = function(count_map, laizi_count) {
        var weight;
        var self = this;
        var func = function(count_map, pair_count, laizi_count) {
            if (pair_count < 0) {
                return WEIGHT.NONE;
            }

            if (pair_count === 0) {
                // 边界条件: 去掉双牌就得3同牌
                weight = self.isTriple(count_map, laizi_count);

                if (weight >= WEIGHT.TRIPLE) {
                    weight += WEIGHT.TRIPLE_WITH_TWO_PAIR - WEIGHT.TRIPLE;
                } else {
                    weight = WEIGHT.NONE;
                }

                return weight;
            }

            for (var poker in count_map) {
                if (! count_map.hasOwnProperty(poker)) {
                    continue;
                }
                poker = parseInt(poker);

                if (count_map[poker] >= 2) {
                    // 去掉一个双牌, 试试
                    count_map[poker] -= 2;

                    weight = func(count_map, pair_count - 1, laizi_count);

                    // 复位
                    count_map[poker] += 2;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                } else if (count_map[poker] >= 1) {
                    if (laizi_count <= 0) {
                        continue;
                    }

                    // 去掉一个单牌 + 赖子, 试试
                    count_map[poker] --;

                    weight = func(count_map, pair_count - 1, laizi_count - 1);

                    // 复位
                    count_map[poker] ++;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                }
            }

            // 没有双牌, 用赖子试试
            if (laizi_count <= 1) {
                return WEIGHT.NONE;
            }

            return func(count_map, pair_count - 1, laizi_count - 2);
        };

        // 检查牌数
        if (this.getPokerCount(count_map, laizi_count) !== 7) {
            return WEIGHT.NONE;
        }

        return func(count_map, 2, laizi_count);
    };
    */

    /**
     * 飞机带单牌翅膀
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isPlaneWithWingSingle = function(count_map, laizi_count) {
        var poker_count = this.getPokerCount(count_map, laizi_count);
        if (poker_count % 4 !== 0) {
            return WEIGHT.NONE;
        }

        var triple_count = poker_count / 4;

        // 至少要2组
        if (triple_count < 2) {
            return WEIGHT.NONE;
        }

        var weight;
        var self = this;
        var func = function(count_map, single_count, laizi_count) {
            var poker;
            if (single_count < 0) {
                return WEIGHT.NONE;
            }

            if (single_count === 0) {
                // 边界条件: 去掉单牌就是三顺
                var count = 0;
                var singles = [];
                for (poker in count_map) {
                    if (! count_map.hasOwnProperty(poker)) {
                        continue;
                    }
                    poker = parseInt(poker);

                    if (count_map[poker] === 0) {
                        continue;
                    }

                    if (count_map[poker] === 4) {
                        continue;
                    }

                    if (count_map[poker] + laizi_count >= 3) {
                        count ++;

                        singles.push(poker);

                        // 用到了的赖子要减掉
                        laizi_count -= 3 - count_map[poker];

                        if (laizi_count < 0) {
                            return WEIGHT.NONE;
                        }
                    } else {
                        return WEIGHT.NONE;
                    }
                }

                if (count === triple_count && self.isStraightWithLength(singles, laizi_count, count)) {
                    // 用3同顺子的最大牌
                    return WEIGHT.PLANE_WITH_WING_SINGLE + singles[singles.length - 1];
                } else {
                    return WEIGHT.NONE;
                }
            }

            for (poker in count_map) {
                if (! count_map.hasOwnProperty(poker)) {
                    continue;
                }
                poker = parseInt(poker);

                if (count_map[poker] >= 1) {
                    // 去掉一个单牌, 试试
                    count_map[poker] --;

                    weight = func(count_map, single_count - 1, laizi_count);

                    // 复位
                    count_map[poker] ++;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                }
            }

            // 没有单牌, 用赖子试试
            if (laizi_count <= 0) {
                return WEIGHT.NONE;
            }

            return func(count_map, single_count - 1, laizi_count - 1);
        };

        return func(count_map, triple_count, laizi_count);
    };

    /**
     * 飞机带双牌翅膀
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isPlaneWithWingPair = function(count_map, laizi_count) {
        var poker_count = this.getPokerCount(count_map, laizi_count);
        if (poker_count % 5 !== 0) {
            return WEIGHT.NONE;
        }

        var triple_count = poker_count / 5;

        // 至少要2组
        if (triple_count < 2) {
            return WEIGHT.NONE;
        }

        var weight;
        var self = this;
        var func = function(count_map, pair_count, laizi_count) {
            var poker;

            if (pair_count < 0) {
                return WEIGHT.NONE;
            }

            if (pair_count === 0) {
                // 边界条件: 去掉单牌就是三顺
                var count = 0;
                var singles = [];
                for (poker in count_map) {
                    if (! count_map.hasOwnProperty(poker)) {
                        continue;
                    }
                    poker = parseInt(poker);

                    if (count_map[poker] === 0) {
                        continue;
                    }

                    if (count_map[poker] === 4) {
                        continue;
                    }

                    if (count_map[poker] + laizi_count >= 3) {
                        count ++;

                        singles.push(poker);

                        // 用到了的赖子要减掉
                        laizi_count -= 3 - count_map[poker];

                        if (laizi_count < 0) {
                            return WEIGHT.NONE;
                        }
                    } else {
                        return WEIGHT.NONE;
                    }
                }

                if (count === triple_count && self.isStraightWithLength(singles, laizi_count, count)) {
                    // 用3同顺子的最大牌
                    return WEIGHT.PLANE_WITH_WING_PAIR + singles[singles.length - 1];
                } else {
                    return WEIGHT.NONE;
                }
            }

            for (poker in count_map) {
                if (! count_map.hasOwnProperty(poker)) {
                    continue;
                }
                poker = parseInt(poker);

                if (count_map[poker] >= 2) {
                    // 去掉一个双牌, 试试
                    count_map[poker] -= 2;

                    weight = func(count_map, pair_count - 1, laizi_count);

                    // 复位
                    count_map[poker] += 2;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                } else if (count_map[poker] >= 1) {
                    if (laizi_count <= 0) {
                        return WEIGHT.NONE;
                    }

                    // 去掉一个单牌 + 赖子, 试试
                    count_map[poker] --;

                    weight = func(count_map, pair_count - 1, laizi_count - 1);

                    // 复位
                    count_map[poker] ++;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                }
            }

            // 没有单牌, 用赖子试试
            if (laizi_count <= 0) {
                return WEIGHT.NONE;
            }

            return func(count_map, pair_count - 1, laizi_count - 1);
        };

        return func(count_map, triple_count, laizi_count);
    };

    /**
     * 三顺(至少2组)
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isTripleStraight = function(count_map, laizi_count) {
        var poker_count = this.getPokerCount(count_map, laizi_count);

        if (poker_count % 3 !== 0) {
            return WEIGHT.NONE;
        }

        var triple_count = poker_count / 3;

        // 至少要2组
        if (triple_count < 2) {
            return WEIGHT.NONE;
        }

        var count = 0;
        var singles = [];
        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }
            poker = parseInt(poker);

            if (count_map[poker] === 4) {
                return WEIGHT.NONE;
            }

            if (count_map[poker] + laizi_count >= 3) {
                count ++;

                singles.push(poker);

                // 减去用到的赖子
                laizi_count -= 3 - count_map[poker];

                if (laizi_count < 0) {
                    return WEIGHT.NONE;
                }
            }
        }

        laizi_count /= 3;

        if (count + laizi_count !== triple_count) {
            return WEIGHT.NONE;
        }

        if (this.isStraightWithLength(singles, laizi_count, triple_count)) {
            var seed_poker = singles[singles.length - 1];

            while (laizi_count > 0 && poker_count > 0) {
                laizi_count --;
                poker_count --;
                if (this.isStraightWithLength(singles, laizi_count, poker_count)) {
                    if (seed_poker < 13) {
                        seed_poker ++;
                    }
                }
            }

            // 算3同顺最大牌
            return WEIGHT.TRIPLE_STRAIGHT + seed_poker;
        }

        return WEIGHT.NONE;
    };

    /**
     * 双顺(至少3组)
     *
     * @param count_map
     * @param laizi_count
     * @param settings
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isPairStraight = function(count_map, laizi_count, settings) {
        var poker_count = this.getPokerCount(count_map, laizi_count);

        if (poker_count % 2 !== 0) {
            return WEIGHT.NONE;
        }

        var pair_count = poker_count / 2;

        // 三人玩法: 至少要3组, 四人玩法: 至少要2组
        if (settings.player_count === 3 && pair_count < 3 || settings.player_count === 4 && pair_count < 2) {
            return WEIGHT.NONE;
        }

        var count = 0;
        var singles = [];
        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }
            poker = parseInt(poker);

            if (count_map[poker] >= 3) {
                return WEIGHT.NONE;
            }

            if (count_map[poker] + laizi_count >= 2) {
                count ++;

                singles.push(poker);

                // 减去用到的赖子
                laizi_count -= 2 - count_map[poker];

                if (laizi_count < 0) {
                    return WEIGHT.NONE;
                }
            }
        }

        laizi_count /= 2;

        if (count + laizi_count !== pair_count) {
            return WEIGHT.NONE;
        }

        if (this.isStraightWithLength(singles, laizi_count, pair_count)) {
            var seed_poker = singles[singles.length - 1];

            while (laizi_count > 0 && poker_count > 0) {
                laizi_count --;
                poker_count --;
                if (this.isStraightWithLength(singles, laizi_count, poker_count)) {
                    if (seed_poker < 13) {
                        seed_poker ++;
                    }
                }
            }

            // 算对子顺最大牌
            return WEIGHT.PAIR_STRAIGHT + seed_poker;
        }

        return WEIGHT.NONE;
    };

    /**
     * 单顺(至少5组)
     *
     * @param count_map
     * @param laizi_count
     * @param settings
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isStraight = function(count_map, laizi_count, settings) {
        var poker_count = this.getPokerCount(count_map, laizi_count);

        // 三人玩法: 至少要5组, 四人玩法: 至少要4组
        if (settings.player_count === 3 && poker_count < 5 || settings.player_count === 4 && poker_count < 4) {
            return WEIGHT.NONE;
        }

        var count = 0;
        var singles = [];
        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }
            poker = parseInt(poker);

            if (count_map[poker] >= 2) {
                return WEIGHT.NONE;
            }

            if (count_map[poker] + laizi_count >= 1) {
                count ++;

                singles.push(poker);

                // 减去用到的赖子
                laizi_count -= 1 - count_map[poker];

                if (laizi_count < 0) {
                    return WEIGHT.NONE;
                }
            }
        }

        if (count + laizi_count !== poker_count) {
            return WEIGHT.NONE;
        }
        if (this.isStraightWithLength(singles, laizi_count, poker_count)) {
            var seed_poker = singles[singles.length - 1];

            while (laizi_count > 0 && poker_count > 0) {
                laizi_count --;
                poker_count --;
                if (this.isStraightWithLength(singles, laizi_count, poker_count)) {
                    if (seed_poker < 13) {
                        seed_poker ++;
                    }
                }
            }

            // 算顺子最大牌
            return WEIGHT.STRAIGHT + seed_poker;
        }

        return WEIGHT.NONE;
    };

    /**
     * 3带1个双牌
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isTripleWithPair = function(count_map, laizi_count) {
        var poker_count = this.getPokerCount(count_map, laizi_count);

        if (poker_count !== 5) {
            return WEIGHT.NONE;
        }

        var triple_count = 1;

        var weight;
        var self = this;
        var func = function(count_map, pair_count, laizi_count) {
            if (pair_count < 0) {
                return WEIGHT.NONE;
            }

            if (pair_count === 0) {
                // 边界条件: 去掉单牌就是3同
                weight = self.isTriple(count_map, laizi_count);
                if (weight >= WEIGHT.TRIPLE) {
                    weight += WEIGHT.TRIPLE_WITH_PAIR - WEIGHT.TRIPLE;
                } else {
                    weight = WEIGHT.NONE;
                }

                return weight;
            }

            for (var poker in count_map) {
                if (! count_map.hasOwnProperty(poker)) {
                    continue;
                }
                poker = parseInt(poker);

                if (count_map[poker] === 4) {
                    // 不能有炸弹
                    continue;
                }

                if (count_map[poker] >= 2) {
                    // 去掉一个双牌, 试试
                    count_map[poker] -= 2;

                    weight = func(count_map, pair_count - 1, laizi_count);

                    // 复位
                    count_map[poker] += 2;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                } else if (count_map[poker] >= 1) {
                    if (laizi_count <= 0) {
                        return WEIGHT.NONE;
                    }

                    // 去掉一个单牌 + 赖子, 试试
                    count_map[poker] --;

                    weight = func(count_map, pair_count - 1, laizi_count - 1);

                    // 复位
                    count_map[poker] ++;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                }
            }

            // 没有单牌, 用赖子试试
            if (laizi_count <= 0) {
                return WEIGHT.NONE;
            }

            return func(count_map, pair_count - 1, laizi_count - 1);
        };

        return func(count_map, triple_count, laizi_count);
    };

    /**
     * 3带1个单牌
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isTripleWithSingle = function(count_map, laizi_count) {
        var poker_count = this.getPokerCount(count_map, laizi_count);

        if (poker_count !== 4) {
            return WEIGHT.NONE;
        }

        var triple_count = 1;

        var weight;
        var self = this;
        var func = function(count_map, single_count, laizi_count) {
            if (single_count < 0) {
                return WEIGHT.NONE;
            }

            if (single_count === 0) {
                // 边界条件: 去掉单牌就是3顺
                weight = self.isTriple(count_map, laizi_count);
                if (weight >= WEIGHT.TRIPLE) {
                    weight += WEIGHT.TRIPLE_WITH_SINGLE - WEIGHT.TRIPLE;
                } else {
                    weight = WEIGHT.NONE;
                }

                return weight;
            }

            for (var poker in count_map) {
                if (! count_map.hasOwnProperty(poker)) {
                    continue;
                }
                poker = parseInt(poker);

                if (count_map[poker] === 4) {
                    // 不能有炸弹
                    continue;
                }

                if (count_map[poker] >= 1) {
                    // 去掉一个单牌, 试试
                    count_map[poker] --;

                    weight = func(count_map, single_count - 1, laizi_count);

                    // 复位
                    count_map[poker] ++;

                    if (weight !== WEIGHT.NONE) {
                        return weight;
                    }
                }
            }

            // 没有单牌, 用赖子试试
            if (laizi_count <= 0) {
                return WEIGHT.NONE;
            }

            return func(count_map, single_count - 1, laizi_count - 1);
        };

        return func(count_map, triple_count, laizi_count);
    };

    /**
     * 三同
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isTriple = function(count_map, laizi_count) {
        if (this.getPokerCount(count_map, laizi_count) !== 3) {
            return WEIGHT.NONE;
        }

        var seed_poker = -1;
        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }
            if (count_map[poker] === 0) {
                continue;
            }

            poker = parseInt(poker);

            if (poker === this.POKER.RED_JOKER || poker === this.POKER.BLACK_JOKER) {
                continue;
            }

            if (count_map[poker] + laizi_count === 3) {
                seed_poker = poker;
            } else {
                return WEIGHT.NONE;
            }
        }
        if (seed_poker === -1) {
            // 说明都是赖子
            return WEIGHT.NONE;
        }

        return WEIGHT.TRIPLE + seed_poker;
    };

    /**
     * 双牌
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isPair = function(count_map, laizi_count) {
        if (this.getPokerCount(count_map, laizi_count) !== 2) {
            return WEIGHT.NONE;
        }

        var seed_poker = -1;
        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }
            if (count_map[poker] === 0) {
                continue;
            }

            poker = parseInt(poker);

            if (poker === this.POKER.RED_JOKER || poker === this.POKER.BLACK_JOKER) {
                continue;
            }

            if (count_map[poker] + laizi_count === 2) {
                seed_poker = poker;
            } else {
                return WEIGHT.NONE;
            }
        }
        if (seed_poker === -1) {
            // 说明都是赖子
            return WEIGHT.NONE;
        }

        return WEIGHT.PAIR + seed_poker;
    };

    /**
     * 单牌
     *
     * @param count_map
     * @param laizi_count
     * @returns {*}
     *      是 权值
     *      否 WEIGHT.NONE
     */
    this.isSingle = function(count_map, laizi_count) {
        if (this.getPokerCount(count_map, laizi_count) !== 1) {
            return WEIGHT.NONE;
        }

        var seed_poker = -1;
        for (var poker in count_map) {
            if (! count_map.hasOwnProperty(poker)) {
                continue;
            }
            if (count_map[poker] === 0) {
                continue;
            }

            poker = parseInt(poker);

            if (count_map[poker] + laizi_count === 1) {
                seed_poker = poker;
            } else {
                return WEIGHT.NONE;
            }
        }

        if (seed_poker === -1) {
            // 赖子不能单独出
            return WEIGHT.NONE;
        }

        return WEIGHT.SINGLE + seed_poker;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  Pattern, 权值相关
    //
    //  getPattern:                         获取指定牌组的Pattern
    //
    //  patternCanWin:                      指定牌组是否胜过老牌组
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 获取指定牌组的Pattern
     *
     * @param pokers
     * @param reference_pattern_name
     * @param laizi
     * @param settings
     * @returns {*}
     *      name    牌型
     *      weight  权值
     *      length  长度
     *      pokers  牌
     */
    this.getPattern = function(pokers, reference_pattern_name, laizi, settings) {
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);

        var makePattern = function(name, weight, length, pokers) {
            return {
                name: name,
                weight: weight,
                length: length,
                pokers: pokers
            }
        };
        var weight;

        // 特殊牌型
        weight = this.isRocket(count_map, laizi_count);
        if (weight !== WEIGHT.NONE) {
            return makePattern(this.PATTERN_NAME.ROCKET, weight, 1, pokers);
        }

        weight = this.isBomb(count_map, laizi_count);
        if (weight !== WEIGHT.NONE) {
            return makePattern(this.PATTERN_NAME.BOMB, weight, 1, pokers);
        }

        // 4人玩法, 两个2/3要算作炸弹
        if (settings.player_count === 4) {
            if (settings.has_no_two_2) {
                // 2个2要算作炸弹
                if (count_map[14] === 2 && pokers.length === 2) {
                    return makePattern(this.PATTERN_NAME.BOMB, WEIGHT.BOMB - 1, 1, pokers);
                }
            } else if (settings.has_no_two_3) {
                // 2个3要算作炸弹
                if (count_map[2] === 2 && pokers.length === 2) {
                    return makePattern(this.PATTERN_NAME.BOMB, WEIGHT.BOMB - 2, 1, pokers);
                }
            }
        }

        // 一般牌型
        if (settings.has_4_dai_2) {
            if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE) {
                weight = this.isFourWithTwoSingle(count_map, laizi_count);
                if (weight !== WEIGHT.NONE) {
                    return makePattern(this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE, weight, 1, pokers);
                }
            }
            if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.FOUR_WITH_TWO_PAIR) {
                weight = this.isFourWithTwoPair(count_map, laizi_count);
                if (weight !== WEIGHT.NONE) {
                    return makePattern(this.PATTERN_NAME.FOUR_WITH_TWO_PAIR, weight, 1, pokers);
                }
            }
        }
        /*if (! settings.has_no_3_dai_2) {
            if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE) {
                weight = this.isTripleWithTwoSingle(count_map, laizi_count);
                if (weight !== WEIGHT.NONE) {
                    return makePattern(this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE, weight, 1, pokers);
                }
            }
            if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR) {
                weight = this.isTripleWithTwoPair(count_map, laizi_count);
                if (weight !== WEIGHT.NONE) {
                    return makePattern(this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR, weight, 1, pokers);
                }
            }
        }*/
        if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.PLANE_WITH_WING_SINGLE) {
            weight = this.isPlaneWithWingSingle(count_map, laizi_count);
            if (weight !== WEIGHT.NONE) {
                return makePattern(this.PATTERN_NAME.PLANE_WITH_WING_SINGLE, weight, (pokers.length / 4), pokers);
            }
        }
        if (! settings.has_no_3_dai_2) {
            if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.PLANE_WITH_WING_PAIR) {
                weight = this.isPlaneWithWingPair(count_map, laizi_count);
                if (weight !== WEIGHT.NONE) {
                    return makePattern(this.PATTERN_NAME.PLANE_WITH_WING_PAIR, weight, (pokers.length / 5), pokers);
                }
            }
        }
        if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.TRIPLE_STRAIGHT) {
            weight = this.isTripleStraight(count_map, laizi_count);
            if (weight !== WEIGHT.NONE) {
                return makePattern(this.PATTERN_NAME.TRIPLE_STRAIGHT, weight, (pokers.length / 3), pokers);
            }
        }
        if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.PAIR_STRAIGHT) {
            weight = this.isPairStraight(count_map, laizi_count, settings);
            if (weight !== WEIGHT.NONE) {
                return makePattern(this.PATTERN_NAME.PAIR_STRAIGHT, weight, (pokers.length / 2), pokers);
            }
        }
        if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.STRAIGHT) {
            weight = this.isStraight(count_map, laizi_count, settings);
            if (weight !== WEIGHT.NONE) {
                return makePattern(this.PATTERN_NAME.STRAIGHT, weight, (pokers.length), pokers);
            }
        }
        if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.TRIPLE_WITH_SINGLE) {
            weight = this.isTripleWithSingle(count_map, laizi_count);
            if (weight !== WEIGHT.NONE) {
                return makePattern(this.PATTERN_NAME.TRIPLE_WITH_SINGLE, weight, 1, pokers);
            }
        }
        if (! settings.has_no_3_dai_2) {
            if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.TRIPLE_WITH_PAIR) {
                weight = this.isTripleWithPair(count_map, laizi_count);
                if (weight !== WEIGHT.NONE) {
                    return makePattern(this.PATTERN_NAME.TRIPLE_WITH_PAIR, weight, 1, pokers);
                }
            }
        }
        if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.TRIPLE) {
            weight = this.isTriple(count_map, laizi_count);
            if (weight !== WEIGHT.NONE) {
                return makePattern(this.PATTERN_NAME.TRIPLE, weight, 1, pokers);
            }
        }
        if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.PAIR) {
            weight = this.isPair(count_map, laizi_count);
            if (weight !== WEIGHT.NONE) {
                return makePattern(this.PATTERN_NAME.PAIR, weight, 1, pokers);
            }
        }
        if (reference_pattern_name === this.PATTERN_NAME.NONE || reference_pattern_name === this.PATTERN_NAME.SINGLE) {
            weight = this.isSingle(count_map, laizi_count);
            if (weight !== WEIGHT.NONE) {
                return makePattern(this.PATTERN_NAME.SINGLE, weight, 1, pokers);
            }
        }

        return null;
    };

    /**
     * 判断指定牌组是否胜过老牌组
     *
     * @param pokers
     * @param old_pattern
     * @param laizi
     * @param settings
     * @returns {*}
     *      null    没有胜过老的牌组
     *      pattern 胜过
     *          name    牌型
     *          weight  权值
     *          length  长度
     *          pokers  牌
     */
    this.patternCanWin = function(pokers, old_pattern, laizi, settings) {
        var pattern = this.getPattern(pokers, old_pattern.name, laizi, settings);

        // 无效牌组
        if (! pattern) {
            return null;
        }

        if (old_pattern.length === 0) {
            return pattern;
        }

        // 如果不是特殊牌组, 牌型&长度必须得相同
        if (pattern.name !== this.PATTERN_NAME.ROCKET &&
            pattern.name !== this.PATTERN_NAME.BOMB &&
            (pattern.name !== old_pattern.name || pattern.length !== old_pattern.length)) {
            return null;
        }

        // 出的牌型(权值)要大于上次出的牌型
        if (pattern.weight <= old_pattern.weight) {
            return null;
        }

        return pattern;
    };

    /**
     * 判断指定牌组是否在手牌中
     *
     * @param holds: 手牌
     * @param pokers: 牌组
     */
    this.contains = function(holds, pokers) {
        for (var i = 0; i < pokers.length; i++) {
            var poker = pokers[i];

            if (holds.indexOf(poker) === -1) {
                return false;
            }
        }

        return true;
    };

    /**
     * 从手牌中删除指定牌组
     *
     * @param holds: 手牌
     * @param pokers: 牌组
     */
    this.deletePokers = function(holds, pokers) {
        for (var i = 0; i < pokers.length; i++) {
            var poker = pokers[i];

            var index = holds.indexOf(poker);
            holds.splice(index, 1);
        }

        return holds;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  提示相关
    //
    //  candidateChuPaiList:                    准备提示牌组
    //
    //  candidateSingle:                        单牌的提示牌组
    //  candidatePair:                          对子的提示牌组
    //  candidateTriple:                        三同的提示牌组
    //  candidateTripleWithSingle:              三带一单牌的提示数组
    //  candidateTripleWithPair:                三带一对子的提示数组
    //  candidateStraight:                      顺子的提示数组
    //  candidatePairStraight:                  双顺的提示数组
    //  candidateTripleStraight:                三顺的提示数组
    //  candidatePlaneWithWingSingle:           飞机带单牌翅膀的提示数组
    //  candidatePlaneWithWingPair:             飞机带对子翅膀的提示数组
    //  candidateTripleWithTwoSingle:           三带两个单牌提示数组
    //  candidateTripleWithTwoPair:             三带两个对子提示数组
    //  candidateFourWithTwoSingle:             四带两个单牌提示牌组
    //  candidateFourWithTwoPair:               四带两个对子提示牌组
    //  candidateBomb:                          炸弹提示牌组
    //
    //  _candidateStraight:                     顺子(单顺, 双顺, 三顺)的提示牌组
    //  _candidateSameWithOneOrTwo:             【三/四】带【一/两】个【单牌/对子】提示牌组
    //  _candidatePlaneWithWing:                飞机带翅膀提示牌组
    //  _candidateBombAndRocket:                炸弹, 火箭提示牌组
    //  _candidatePureSames:                    返回所有天然相同牌(单牌, 对子, 三同, 炸弹)
    //  _candidateLaiziSames:                   返回所有赖子相同牌(对子, 三同, 炸弹)
    //  _candidateRocket:                       返回火箭
    //
    //  _prepareSingles:                        返回可用的单牌
    //  _preparePairs:                          返回所有可用的对子
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 准备提示牌组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     * @returns {Array}
     */
    this.candidateChuPaiList = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        var candidates = [];

        switch (pattern.name) {
            case this.PATTERN_NAME.NONE:
                return candidates;

            case this.PATTERN_NAME.SINGLE:
                return this.candidateSingle(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.PAIR:
                return this.candidatePair(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.TRIPLE:
                return this.candidateTriple(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.TRIPLE_WITH_SINGLE:
                return this.candidateTripleWithSingle(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.TRIPLE_WITH_PAIR:
                return this.candidateTripleWithPair(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.STRAIGHT:
                return this.candidateStraight(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.PAIR_STRAIGHT:
                return this.candidatePairStraight(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.TRIPLE_STRAIGHT:
                return this.candidateTripleStraight(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.PLANE_WITH_WING_SINGLE:
                return this.candidatePlaneWithWingSingle(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.PLANE_WITH_WING_PAIR:
                return this.candidatePlaneWithWingPair(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            /*case this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE:
                return this.candidateTripleWithTwoSingle(pokers, laizi, pattern);

            case this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR:
                return this.candidateTripleWithTwoPair(pokers, laizi, pattern);*/

            case this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE:
                return this.candidateFourWithTwoSingle(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.FOUR_WITH_TWO_PAIR:
                return this.candidateFourWithTwoPair(pokers, laizi, pattern, settings, exclude_bomb_and_rocket);

            case this.PATTERN_NAME.BOMB:
                return this.candidateBomb(pokers, laizi, pattern, settings);

            case this.PATTERN_NAME.ROCKET:
            default:
                return candidates;
        }
    };

    /**
     * 单牌的提示牌组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     * @returns {Array}
     */
    this.candidateSingle = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        var candidates, candidate;
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);

        // 1. 天然单牌(孤立的牌)
        candidates = this._candidatePureSames(this.PATTERN_NAME.SINGLE, count_map, WEIGHT.SINGLE, pattern.weight, false);

        // 2. 天然单牌(有组的牌)
        candidate = this._candidatePureSames(this.PATTERN_NAME.SINGLE, count_map, WEIGHT.SINGLE, pattern.weight, true);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        // 火箭要过滤
        if (count_map[this.POKER.BLACK_JOKER] + count_map[this.POKER.RED_JOKER] === 2) {
            for (var i = candidates.length - 1; i >= 0; i--) {
                candidate = candidates[i];
                if (candidate.indexOf(this.POKER.RED_JOKER) !== -1 || candidate.indexOf(this.POKER.BLACK_JOKER) !== -1) {
                    candidates.splice(i, 1);
                }
            }
        }

        if (! exclude_bomb_and_rocket) {
            // 3. 炸弹 + 火箭
            candidate = this._candidateBombAndRocket(count_map, laizi_number, laizi_count, settings);
            if (candidate.length > 0) {
                candidates = candidates.concat(candidate);
            }
        }

        return candidates;
    };

    /**
     * 对子的提示牌组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     * @returns {Array}
     */
    this.candidatePair = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        var candidates, candidate;
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);

        // 1. 所有可赢的天然对子(孤立的牌)
        candidates = this._candidatePureSames(this.PATTERN_NAME.PAIR, count_map, WEIGHT.PAIR, pattern.weight, false);

        // 2. 所有可赢的赖子对子(孤立的牌)
        candidate = this._candidateLaiziSames(this.PATTERN_NAME.PAIR, count_map, laizi_number, laizi_count, WEIGHT.PAIR, pattern.weight);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        // 3. 所有可赢的对子(有组的牌)
        candidate = this._candidatePureSames(this.PATTERN_NAME.PAIR, count_map, WEIGHT.PAIR, pattern.weight, true);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        if (! exclude_bomb_and_rocket) {
            // 4. 炸弹 + 火箭
            candidate = this._candidateBombAndRocket(count_map, laizi_number, laizi_count, settings);
            if (candidate.length > 0) {
                candidates = candidates.concat(candidate);
            }
        }

        return candidates;
    };

    /**
     * 三同的提示牌组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     * @returns {Array}
     */
    this.candidateTriple = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        var candidates, candidate;
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);

        // 1. 天然三同
        candidates = this._candidatePureSames(this.PATTERN_NAME.TRIPLE, count_map, WEIGHT.TRIPLE, pattern.weight);

        // 2. 赖子三同
        candidate = this._candidateLaiziSames(this.PATTERN_NAME.TRIPLE, count_map, laizi_number, laizi_count, WEIGHT.TRIPLE, pattern.weight);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        if (! exclude_bomb_and_rocket) {
            // 3. 炸弹 + 火箭
            candidate = this._candidateBombAndRocket(count_map, laizi_number, laizi_count, settings);
            if (candidate.length > 0) {
                candidates = candidates.concat(candidate);
            }
        }

        return candidates;
    };

    /**
     * 三带一单牌的提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     */
    this.candidateTripleWithSingle = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidateSameWithOneOrTwo(this.PATTERN_NAME.TRIPLE_WITH_SINGLE, pokers, laizi, pattern, settings, exclude_bomb_and_rocket);
    };

    /**
     * 三带一对子的提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     */
    this.candidateTripleWithPair = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidateSameWithOneOrTwo(this.PATTERN_NAME.TRIPLE_WITH_PAIR, pokers, laizi, pattern, settings, exclude_bomb_and_rocket);
    };

    /**
     * 顺子的提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     * @returns {Array}
     */
    this.candidateStraight = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidateStraight(this.PATTERN_NAME.STRAIGHT, pokers, laizi, pattern, exclude_bomb_and_rocket, settings);
    };

    /**
     * 双顺的提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     * @returns {Array}
     */
    this.candidatePairStraight = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidateStraight(this.PATTERN_NAME.PAIR_STRAIGHT, pokers, laizi, pattern, exclude_bomb_and_rocket, settings);
    };

    /**
     * 三顺的提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     * @returns {Array}
     */
    this.candidateTripleStraight = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidateStraight(this.PATTERN_NAME.TRIPLE_STRAIGHT, pokers, laizi, pattern, exclude_bomb_and_rocket, settings);
    };

    /**
     * 飞机带单牌翅膀的提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     */
    this.candidatePlaneWithWingSingle = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidatePlaneWithWing(this.PATTERN_NAME.PLANE_WITH_WING_SINGLE, pokers, laizi, pattern, settings, exclude_bomb_and_rocket);
    };

    /**
     * 飞机带对子翅膀的提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     */
    this.candidatePlaneWithWingPair = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidatePlaneWithWing(this.PATTERN_NAME.PLANE_WITH_WING_PAIR, pokers, laizi, pattern, settings, exclude_bomb_and_rocket);
    };

    /**
     * 三带两个单牌提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     *
    this.candidateTripleWithTwoSingle = function(pokers, laizi, pattern) {
        return this._candidateSameWithOneOrTwo(this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE, pokers, laizi, pattern);
    };
    */
    /**
     * 三带两个对子提示数组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     *
    this.candidateTripleWithTwoPair = function(pokers, laizi, pattern) {
        return this._candidateSameWithOneOrTwo(this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR, pokers, laizi, pattern);
    };
     */

    /**
     * 四带两个单牌提示牌组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     */
    this.candidateFourWithTwoSingle = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidateSameWithOneOrTwo(this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE, pokers, laizi, pattern, settings, exclude_bomb_and_rocket);
    };

    /**
     * 四带两个对子提示牌组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     */
    this.candidateFourWithTwoPair = function(pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        return this._candidateSameWithOneOrTwo(this.PATTERN_NAME.FOUR_WITH_TWO_PAIR, pokers, laizi, pattern, settings, exclude_bomb_and_rocket);
    };

    /**
     * 炸弹提示牌组
     *
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @returns {Array}
     */
    this.candidateBomb = function(pokers, laizi, pattern, settings) {
        var candidates = [], candidate;
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);

        // 4人玩法, 两个2/3要算作炸弹
        if (settings.player_count === 4) {
            if (settings.has_no_two_2) {
                // 2个2要算作炸弹
                if (count_map[14] === 2) {
                    if (pattern.weight < WEIGHT.BOMB - 1) {
                        candidates.push([14, 14]);
                    }
                }
            }
        }

        // 1. 所有天然炸弹
        candidate = this._candidatePureSames(this.PATTERN_NAME.BOMB, count_map, WEIGHT.BOMB, pattern.weight);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        // 2. 所有赖子炸弹
        candidate = this._candidateLaiziSames(this.PATTERN_NAME.BOMB, count_map, laizi_number, laizi_count, WEIGHT.BOMB, pattern.weight);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        // 3. 火箭
        candidate = this._candidateRocket(count_map);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        return candidates;
    };

    /**
     * 顺子(单顺, 双顺, 三顺)的提示牌组
     *
     * @param pattern_name
     * @param pokers
     * @param laizi
     * @param pattern
     * @param only_need_straight
     * @param settings
     * @returns {Array}
     * @private
     */
    this._candidateStraight = function(pattern_name, pokers, laizi, pattern, only_need_straight, settings) {
        var candidates = [], candidate;
        var laizi_use_maps = {};
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);
        var i, poker_number;
        var straight_length = pattern.length;
        var self = this;

        var bundle_count;
        var base_weight;

        switch (pattern_name) {
            default:
            case this.PATTERN_NAME.STRAIGHT:
                bundle_count = 1;
                base_weight = WEIGHT.STRAIGHT;
                break;

            case this.PATTERN_NAME.PAIR_STRAIGHT:
                bundle_count = 2;
                base_weight = WEIGHT.PAIR_STRAIGHT;
                break;

            case this.PATTERN_NAME.TRIPLE_STRAIGHT:
                bundle_count = 3;
                base_weight = WEIGHT.TRIPLE_STRAIGHT;
                break;

            case this.PATTERN_NAME.PLANE_WITH_WING_SINGLE:
                bundle_count = 3;
                base_weight = WEIGHT.PLANE_WITH_WING_SINGLE;
                break;

            case this.PATTERN_NAME.PLANE_WITH_WING_PAIR:
                bundle_count = 3;
                base_weight = WEIGHT.PLANE_WITH_WING_PAIR;
                break;
        }

        var inflate = function(candidate) {
            var result = [];
            for (var i = 0; i < candidate.length; i++) {
                poker_number = candidate[i];

                if (laizi_use_maps[poker_number] === undefined) {
                    laizi_use_maps[poker_number] = 0;
                }

                for (var j = 0; j < laizi_use_maps[poker_number]; j++) {
                    result.push(laizi_number);
                }
                for (j = laizi_use_maps[poker_number]; j < bundle_count; j++) {
                    result.push(candidate[i]);
                }
            }

            return result;
        };

        var pureStraight = function(allow_split_bomb) {
            for (var start = 2; start <= 14 - straight_length; start++) {
                candidate = [];
                for (i = 0; i < straight_length; i++) {
                    poker_number = start + i;
                    if (! allow_split_bomb && count_map[poker_number] === 4) {
                        break;
                    }

                    if (count_map[poker_number] >= bundle_count) {
                        candidate.push(poker_number);
                    }
                }

                if (candidate.length === straight_length) {
                    // 比较权值
                    if ((base_weight + candidate[start + straight_length - 1]) > pattern.weight) {
                        candidate = inflate(candidate);
                        if (! UTIL.containsArray(candidates, candidate)) {
                            candidates.push(candidate);
                        }
                    }
                }
            }
        };

        var laiziStraight = function(allow_split_bomb) {
            for (var start = 2; start <= 14 - straight_length; start++) {
                candidate = [];
                laizi_use_maps = {};
                var left_laizi_count = laizi_count;
                for (i = 0; i < straight_length; i++) {
                    poker_number = start + i;
                    if (! allow_split_bomb && count_map[poker_number] === 4) {
                        break;
                    }

                    if (count_map[poker_number] >= bundle_count) {
                        candidate.push(poker_number);
                    } else if (count_map[poker_number] > 0 && (count_map[poker_number] + left_laizi_count >= bundle_count)) {
                        candidate.push(poker_number);
                        left_laizi_count -= bundle_count - count_map[poker_number];
                        // 记录所用到的赖子
                        laizi_use_maps[poker_number] = bundle_count - count_map[poker_number];
                    }
                }

                var need_laizi_count = (straight_length - candidate.length);

                if (need_laizi_count * bundle_count > left_laizi_count) {
                    continue;
                }

                if (self.isStraightWithLength(candidate, need_laizi_count, straight_length)) {
                    // 比较权值
                    if ((base_weight + (start + straight_length - 1)) > pattern.weight) {
                        // 缺的赖子给补上
                        for (var j = 0; j < need_laizi_count; j++) {
                            candidate.push(laizi_number);
                        }

                        candidate = inflate(candidate);
                        if (! UTIL.containsArray(candidates, candidate)) {
                            candidates.push(candidate);
                        }
                    }
                }
            }
        };

        // 1. 所有可赢的天然顺子(不允许拆开炸弹牌)
        pureStraight(false);

        // 2. 所有可赢的赖子顺子(不允许拆开炸弹牌)
        laiziStraight(false);

        // 3. 所有可赢的天然顺子(允许拆开炸弹牌)
        pureStraight(true);

        // 4. 所有可赢的赖子顺子(允许拆开炸弹牌)
        laiziStraight(true);

        if (only_need_straight) {
            return candidates;
        }

        // 5. 炸弹 + 火箭
        candidate = this._candidateBombAndRocket(count_map, laizi_number, laizi_count, settings);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        return candidates;
    };

    /**
     * 【三/四】带【一/两】个【单牌/对子】提示牌组
     *
     * @param pattern_name
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     */
    this._candidateSameWithOneOrTwo = function(pattern_name, pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        var candidates = [], candidate;
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);
        var poker_number;
        var sames, pure_sames, laizi_sames;
        var entries = [];
        var base_weight, entry_count, entry_length;

        switch (pattern_name) {
            case this.PATTERN_NAME.TRIPLE_WITH_SINGLE:
                base_weight = WEIGHT.TRIPLE_WITH_SINGLE;
                entry_count = 1;
                entry_length = 1;
                break;

            case this.PATTERN_NAME.TRIPLE_WITH_PAIR:
                base_weight = WEIGHT.TRIPLE_WITH_PAIR;
                entry_count = 1;
                entry_length = 2;
                break;

            /*case this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE:
                base_weight = WEIGHT.TRIPLE_WITH_TWO_SINGLE;
                entry_count = 2;
                entry_length = 1;
                break;

            case this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR:
                base_weight = WEIGHT.TRIPLE_WITH_TWO_PAIR;
                entry_count = 2;
                entry_length = 2;
                break;*/

            case this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE:
                base_weight = WEIGHT.FOUR_WITH_TWO_SINGLE;
                entry_count = 2;
                entry_length = 1;
                break;

            case this.PATTERN_NAME.FOUR_WITH_TWO_PAIR:
                base_weight = WEIGHT.FOUR_WITH_TWO_PAIR;
                entry_count = 2;
                entry_length = 2;
                break;
        }

        // 1.1 准备天然相同牌
        pure_sames = this._candidatePureSames(pattern_name, count_map, base_weight, pattern.weight);

        // 1.2 准备赖子相同牌
        laizi_sames = this._candidateLaiziSames(pattern_name, count_map, laizi_number, laizi_count, base_weight, pattern.weight);

        sames = pure_sames;
        if (laizi_sames.length > 0) {
            sames = sames.concat(laizi_sames);
        }

        if (sames.length > 0) {
            var prepareCandidates = function (same) {
                var _entries = [];

                var func = function (left_count, start) {
                    if (left_count === 0) {
                        // 组合([[1,2], [2,3]] => [1,2,2,3])
                        candidate = same.concat(UTIL.flattenNumberArray(_entries));

                        if (UTIL.elementCount(candidate, laizi_number) <= laizi_count && !UTIL.containsArray(candidates, candidate)) {
                            candidates.push(candidate);
                        }
                        return;
                    }

                    for (var index = start; index < entries.length; index++) {
                        _entries.push(entries[index]);
                        func(left_count - 1, index + 1);
                        _entries.pop();
                    }
                };

                func(entry_count, 0);
            };

            // 2. 准备单牌/对子
            for (var i = 0; i < sames.length; i++) {
                var same = sames[i];

                // 从手牌中删除
                for (var j = 0; j < same.length; j++) {
                    poker_number = same[j];
                    count_map[poker_number]--;
                }

                if (entry_length === 1) {
                    // 准备单牌
                    entries = this._prepareSingles(pattern_name, count_map);
                } else if (entry_length === 2) {
                    // 准备对子
                    entries = this._preparePairs(pattern_name, count_map, laizi_number, laizi_count);
                }

                // 组合
                prepareCandidates(same);

                // 恢复
                for (j = 0; j < same.length; j++) {
                    poker_number = same[j];
                    count_map[poker_number]++;
                }
            }
        }

        if (! exclude_bomb_and_rocket) {
            // 3. 炸弹 + 火箭
            candidate = this._candidateBombAndRocket(count_map, laizi_number, laizi_count, settings);
            if (candidate.length > 0) {
                candidates = candidates.concat(candidate);
            }
        }

        return candidates;
    };

    /**
     * 飞机带翅膀提示牌组
     *
     * @param pattern_name
     * @param pokers
     * @param laizi
     * @param pattern
     * @param settings
     * @param exclude_bomb_and_rocket
     * @returns {Array}
     * @private
     */
    this._candidatePlaneWithWing = function(pattern_name, pokers, laizi, pattern, settings, exclude_bomb_and_rocket) {
        var candidates = [], candidate;
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);
        var i, j, poker_number;
        var wing_length = pattern.length;
        var entries = [], entry_length;

        switch (pattern_name) {
            default:
            case this.PATTERN_NAME.PLANE_WITH_WING_SINGLE:
                entry_length = 1;
                break;

            case this.PATTERN_NAME.PLANE_WITH_WING_PAIR:
                entry_length = 2;
                break;
        }

        // 1. 准备三顺
        var triple_straight_candidates = this._candidateStraight(pattern_name, pokers, laizi, pattern, true);

        var prepareCandidates = function(triple_straight_candidate) {
            var _entries = [];

            var func = function(left_count, start) {
                if (left_count === 0) {
                    // 组合([[1,2], [2,3]] => [1,2,2,3])
                    candidate = triple_straight_candidate.concat(UTIL.flattenNumberArray(_entries));

                    if (UTIL.elementCount(candidate, laizi_number) <= laizi_count && ! UTIL.containsArray(candidates, candidate)) {
                        candidates.push(candidate);
                    }
                    return;
                }

                for (var index = start; index < entries.length; index++) {
                    _entries.push(entries[index]);
                    func(left_count - 1, index + 1);
                    _entries.pop();
                }
            };

            func(wing_length, 0);
        };

        // 2. 准备单牌/对子
        for (i = 0; i < triple_straight_candidates.length; i++) {
            var triple_straight_candidate = triple_straight_candidates[i];

            // 从手牌中删除
            for (j = 0; j < triple_straight_candidate.length; j++) {
                poker_number = triple_straight_candidate[j];
                count_map[poker_number] --;
            }

            if (entry_length === 1) {
                // 准备单牌
                entries = this._prepareSingles(pattern_name, count_map);
            } else {
                // 准备对子
                entries = this._preparePairs(pattern_name, count_map, laizi_number, laizi_count);
            }

            // 组合
            prepareCandidates(triple_straight_candidate);

            // 恢复
            for (j = 0; j < triple_straight_candidate.length; j++) {
                poker_number = triple_straight_candidate[j];
                count_map[poker_number] ++;
            }
        }

        if (! exclude_bomb_and_rocket) {
            // 3. 炸弹 + 火箭
            candidate = this._candidateBombAndRocket(count_map, laizi_number, laizi_count, settings);
            if (candidate.length > 0) {
                candidates = candidates.concat(candidate);
            }
        }

        return candidates;
    };

    /**
     * 炸弹, 火箭提示牌组
     *
     * @param count_map
     * @param laizi_number
     * @param laizi_count
     * @param settings
     * @returns {Array}
     * @private
     */
    this._candidateBombAndRocket = function(count_map, laizi_number, laizi_count, settings) {
        var candidates = [], candidate;

        // 4人玩法, 两个2/3要算作炸弹
        if (settings.player_count === 4) {
            if (settings.has_no_two_2) {
                // 2个2要算作炸弹
                if (count_map[14] === 2) {
                    candidates.push([14, 14]);
                }
            } else if (settings.has_no_two_3) {
                // 2个3要算作炸弹
                if (count_map[2] === 2) {
                    candidates.push([2, 2]);
                }
            }
        }

        // 1. 所有天然炸弹
        candidate = this._candidatePureSames(this.PATTERN_NAME.BOMB, count_map);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        // 2. 所有赖子炸弹
        candidate = this._candidateLaiziSames(this.PATTERN_NAME.BOMB, count_map, laizi_number, laizi_count);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        // 3. 火箭
        candidate = this._candidateRocket(count_map);
        if (candidate.length > 0) {
            candidates = candidates.concat(candidate);
        }

        return candidates;
    };

    /**
     * 返回所有天然相同牌(单牌, 对子, 三同, 炸弹)
     *
     * @param pattern_name
     * @param count_map
     * @param base_weight
     * @param threshhold_weight
     * @param strict_mode
     * @returns {Array}
     * @private
     */
    this._candidatePureSames = function(pattern_name, count_map, base_weight, threshhold_weight, strict_mode) {
        var candidates = [];
        var wished_count;

        switch (pattern_name) {
            case this.PATTERN_NAME.SINGLE:
                wished_count = 1;
                break;

            case this.PATTERN_NAME.PAIR:
                wished_count = 2;
                break;

            case this.PATTERN_NAME.TRIPLE:
            case this.PATTERN_NAME.TRIPLE_WITH_SINGLE:
            case this.PATTERN_NAME.TRIPLE_WITH_PAIR:
            //case this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE:
            //case this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR:
            case this.PATTERN_NAME.PLANE_WITH_WING_SINGLE:
            case this.PATTERN_NAME.PLANE_WITH_WING_PAIR:
                wished_count = 3;
                break;

            case this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE:
            case this.PATTERN_NAME.FOUR_WITH_TWO_PAIR:
            case this.PATTERN_NAME.BOMB:
                wished_count = 4;
                break;

            default:
                wished_count = 0;
        }

        for (var poker_number in count_map) {
            if (! count_map.hasOwnProperty(poker_number)) {
                continue;
            }
            poker_number = parseInt(poker_number);

            if (base_weight) {
                if (base_weight + poker_number <= threshhold_weight) {
                    continue;
                }
            }

            if ((! strict_mode && count_map[poker_number] === wished_count) ||
                (strict_mode && count_map[poker_number] > wished_count && count_map[poker_number] < 4)) {
                var candidate = [];
                for (var i = 0; i < wished_count; i++) {
                    candidate.push(poker_number);
                }
                candidates.push(candidate);
            }
        }

        return candidates;
    };

    /**
     * 返回所有赖子相同牌(对子, 三同, 炸弹)
     *
     * @param pattern_name
     * @param count_map
     * @param laizi_number
     * @param laizi_count
     * @param base_weight
     * @param threshhold_weight
     * @returns {Array}
     * @private
     */
    this._candidateLaiziSames = function(pattern_name, count_map, laizi_number, laizi_count, base_weight, threshhold_weight) {
        var candidates = [];
        var wished_count;

        switch (pattern_name) {
            case this.PATTERN_NAME.PAIR:
                wished_count = 2;
                break;

            case this.PATTERN_NAME.TRIPLE:
                wished_count = 3;
                break;

            case this.PATTERN_NAME.BOMB:
                wished_count = 4;
                break;

            default:
                wished_count = 0;
        }

        if (laizi_count > 0) {
            for (var poker_number in count_map) {
                if (! count_map.hasOwnProperty(poker_number)) {
                    continue;
                }
                poker_number = parseInt(poker_number);

                if (poker_number === this.POKER.BLACK_JOKER || poker_number === this.POKER.RED_JOKER) {
                    continue;
                }

                if (count_map[poker_number] >= wished_count) {
                    continue;
                }

                if (base_weight) {
                    if (base_weight + poker_number <= threshhold_weight) {
                        continue;
                    }
                }

                if (count_map[poker_number] + laizi_count >= wished_count) {
                    var candidate = [];
                    for (var i = 0; i < count_map[poker_number]; i++) {
                        candidate.push(poker_number);
                    }
                    for (i = count_map[poker_number]; i < wished_count; i++) {
                        candidate.push(laizi_number);
                    }

                    candidates.push(candidate);
                }
            }
        }

        return candidates;
    };

    /**
     * 返回火箭
     *
     * @param count_map
     * @returns {Array}
     * @private
     */
    this._candidateRocket = function(count_map) {
        var candidates = [];
        if (count_map[this.POKER.RED_JOKER] + count_map[this.POKER.BLACK_JOKER] === 2) {
            candidates.push([
                this.POKER.RED_JOKER,
                this.POKER.BLACK_JOKER
            ]);
        }

        return candidates;
    };

    /**
     * 返回可用的单牌
     *
     * @param pattern_name
     * @param count_map
     * @returns {Array}
     * @private
     */
    this._prepareSingles = function(pattern_name, count_map) {
        var singles = [], pair_singles = [], triple_singles = [], bomb_singles = [];

        var need_single_count = 0;

        switch (pattern_name) {
            case this.PATTERN_NAME.PLANE_WITH_WING_SINGLE:
            //case this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE:
            case this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE:
                // 需要两个单牌
                need_single_count = 2;
                break;

            default:
            case this.PATTERN_NAME.TRIPLE_WITH_SINGLE:
                // 需要一个单牌
                need_single_count = 1;
                break;
        }

        for (var poker_number in count_map) {
            if (! count_map.hasOwnProperty(poker_number)) {
                continue;
            }

            poker_number = parseInt(poker_number);

            if (count_map[poker_number] === 1) {
                singles.push([poker_number]);
            } else if (count_map[poker_number] === 2) {
                pair_singles.push([poker_number]);
                if (need_single_count === 2) {
                    pair_singles.push([poker_number]);
                }
            } else if (count_map[poker_number] === 3) {
                triple_singles.push([poker_number]);
                if (need_single_count === 2) {
                    triple_singles.push([poker_number]);
                }
            } else if (count_map[poker_number] === 4) {
                bomb_singles.push([poker_number]);
                if (need_single_count === 2) {
                    bomb_singles.push([poker_number]);
                }
            }
        }

        // 火箭要过滤
        if (count_map[this.POKER.BLACK_JOKER] + count_map[this.POKER.RED_JOKER] === 2) {
            for (var i = singles.length - 1; i >= 0; i--) {
                var single = singles[i];
                if (single.indexOf(this.POKER.RED_JOKER) !== -1 || single.indexOf(this.POKER.BLACK_JOKER) !== -1) {
                    singles.splice(i, 1);
                }
            }
        }

        switch (pattern_name) {
            case this.PATTERN_NAME.PLANE_WITH_WING_SINGLE:
                // 飞机需要2+个单牌, 炸弹也可以拆分
                if (pair_singles.length > 0) {
                    singles = singles.concat(pair_singles);
                }
                if (triple_singles.length > 0) {
                    singles = singles.concat(triple_singles);
                }
                if (bomb_singles.length > 0) {
                    singles = singles.concat(bomb_singles);
                }
                return singles;

            //case this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE:
            case this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE:
                // 需要两个单牌, 炸弹不要拆
                if (pair_singles.length > 0) {
                    singles = singles.concat(pair_singles);
                }
                if (triple_singles.length > 0) {
                    singles = singles.concat(triple_singles);
                }
                return singles;

            default:
            case this.PATTERN_NAME.TRIPLE_WITH_SINGLE:
                // 需要一个单牌
                if (singles.length > 0) {
                    return singles;
                }
                if (pair_singles.length > 0) {
                    return pair_singles;
                }

                return triple_singles;
        }
    };

    /**
     * 返回所有可用的对子
     *
     * @param pattern_name
     * @param count_map
     * @param laizi_number
     * @param laizi_count
     * @returns {Array}
     * @private
     */
    this._preparePairs = function(pattern_name, count_map, laizi_number, laizi_count) {
        var pairs = [], pure_pairs = [], laizi_pairs = [], triple_pairs = [], bomb_pairs = [];

        var need_pair_count = 0;

        switch (pattern_name) {
            //case this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR:
            case this.PATTERN_NAME.FOUR_WITH_TWO_PAIR:
            case this.PATTERN_NAME.PLANE_WITH_WING_PAIR:
                // 如上几种牌型都需要两个对子, 炸弹可以拆成两个对子
                need_pair_count = 2;
                break;

            default:
            case this.PATTERN_NAME.TRIPLE_WITH_PAIR:
                // 只需要一个对子的牌型
                need_pair_count = 1;
                break;
        }

        for (var poker_number in count_map) {
            if (! count_map.hasOwnProperty(poker_number)) {
                continue;
            }

            poker_number = parseInt(poker_number);

            if (count_map[poker_number] === 1 && count_map[poker_number] + laizi_count >= 2) {
                laizi_pairs.push([poker_number, laizi_number]);
            } else if (count_map[poker_number] === 2) {
                pure_pairs.push([poker_number, poker_number]);
            } else if (count_map[poker_number] === 3) {
                triple_pairs.push([poker_number, poker_number]);
            } else if (count_map[poker_number] === 4) {
                bomb_pairs.push([poker_number, poker_number]);
                if (need_pair_count === 2) {
                    bomb_pairs.push([poker_number, poker_number]);
                }
            }
        }

        if (need_pair_count === 2) {
            // 如上几种牌型都需要两个对子, 炸弹可以拆成两个对子
            pairs = pure_pairs;
            if (laizi_pairs.length > 0) {
                pairs = pairs.concat(laizi_pairs);
            }
            if (triple_pairs.length > 0) {
                pairs = pairs.concat(triple_pairs);
            }
            if (bomb_pairs.length > 0) {
                pairs = pairs.concat(bomb_pairs);
            }

            return pairs;
        } else {
            // 只需要一个对子的牌型
            pairs = pure_pairs;
            if (laizi_pairs.length > 0) {
                pairs = pairs.concat(laizi_pairs);
            }
            if (triple_pairs.length > 0) {
                pairs = pairs.concat(triple_pairs);
            }

            return pairs;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    //  代替赖子相关
    //
    //  findOriginalPokers:                 将赖子替换成牌型的原始牌, 并返回
    //
    //  _findOriginalSames:                 替换对子/三同/炸弹
    //  _findOriginalStraight:              替换顺子(顺子/双顺/三顺)
    //  _findOriginalSameWithOneOrTwo:      替换【三/四】带【一/二】个【单/双】牌
    //  _findOriginalPlaneWithWing:         替换飞机带【单/双】翅膀
    //
    //  _replaceLaizi:                      赖子替换的牌(例如, 7 + 104 = 111, 前端解析的时候, 用赖子花色来渲染)
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 将赖子替换成牌型的原始牌, 并返回
     *
     * @param pattern
     * @param laizi
     * @returns {Array}
     */
    this.findOriginalPokers = function(pattern, laizi) {
        var pokers = pattern.pokers;
        var laizi_count = this.laiziCount(pokers, laizi);

        // 没有赖子, 直接返回
        if (laizi_count === 0) {
            return pokers;
        }

        switch (pattern.name) {
            default:
            case this.PATTERN_NAME.NONE:
            case this.PATTERN_NAME.SINGLE:
                return pokers;

            case this.PATTERN_NAME.PAIR:
            case this.PATTERN_NAME.TRIPLE:
            case this.PATTERN_NAME.BOMB:
                return this._findOriginalSames(pattern, laizi);

            case this.PATTERN_NAME.TRIPLE_WITH_SINGLE:
            case this.PATTERN_NAME.TRIPLE_WITH_PAIR:
            //case this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE:
            //case this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR:
            case this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE:
            case this.PATTERN_NAME.FOUR_WITH_TWO_PAIR:
                return this._findOriginalSameWithOneOrTwo(pattern, laizi);

            case this.PATTERN_NAME.STRAIGHT:
            case this.PATTERN_NAME.PAIR_STRAIGHT:
            case this.PATTERN_NAME.TRIPLE_STRAIGHT:
                return this._findOriginalStraight(pattern, laizi);

            case this.PATTERN_NAME.PLANE_WITH_WING_SINGLE:
            case this.PATTERN_NAME.PLANE_WITH_WING_PAIR:
                return this._findOriginalPlaneWithWing(pattern, laizi);
        }
    };

    /**
     * 替换对子/三同/炸弹
     *
     * @param pattern
     * @param laizi
     * @returns {*}
     * @private
     */
    this._findOriginalSames = function(pattern, laizi) {
        var pokers = pattern.pokers;
        var unit_poker;

        switch (pattern.name) {
            case this.PATTERN_NAME.PAIR:
                unit_poker = pattern.weight - WEIGHT.PAIR;
                break;

            case this.PATTERN_NAME.TRIPLE:
                unit_poker = pattern.weight - WEIGHT.TRIPLE;
                break;

            case this.PATTERN_NAME.BOMB:
                unit_poker = pattern.weight - WEIGHT.BOMB;
                break;
        }

        for (var i = 0; i < pokers.length; i++) {
            if (this.isLaizi(pokers[i], laizi)) {
                pokers[i] = this._replaceLaizi(unit_poker);
            }
        }

        return pokers;
    };

    /**
     * 替换顺子(顺子/双顺/三顺)
     *
     * @param pattern
     * @param laizi
     * @returns {*}
     * @private
     */
    this._findOriginalStraight = function(pattern, laizi) {
        var pokers = pattern.pokers;
        var seed_poker, seed_length;
        var straight_length = pattern.length;
        var count_map = this.countMap(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);
        var i, poker_number;
        var candidates = [];

        switch (pattern.name) {
            case this.PATTERN_NAME.STRAIGHT:
                seed_poker = pattern.weight - WEIGHT.STRAIGHT;
                seed_length = 1;
                break;

            case this.PATTERN_NAME.PAIR_STRAIGHT:
                seed_poker = pattern.weight - WEIGHT.PAIR_STRAIGHT;
                seed_length = 2;
                break;

            case this.PATTERN_NAME.TRIPLE_STRAIGHT:
                seed_poker = pattern.weight - WEIGHT.TRIPLE_STRAIGHT;
                seed_length = 3;
                break;
        }

        for (i = 0; i < straight_length; i++) {
            poker_number = seed_poker - i;

            if (count_map[poker_number] === undefined) {
                count_map[poker_number] = 0;
            }

            if (count_map[poker_number] < seed_length) {
                for (var j = 0; j < seed_length - count_map[poker_number]; j++) {
                    candidates.push(poker_number);
                }
            }
        }

        for (i = pokers.length - 1; i >= 0; i--) {
            poker_number = this.weightedNumber(pokers[i]);

            if (poker_number === laizi_number) {
                // 替换
                pokers[i] = this._replaceLaizi(candidates.pop());
            }
        }

        this.sortPokersWithLaizi(pokers);

        return pokers;
    };

    /**
     * 替换【三/四】带【一/二】个【单/双】牌
     *
     * @param pattern
     * @param laizi
     * @returns {*}
     * @private
     */
    this._findOriginalSameWithOneOrTwo = function(pattern, laizi) {
        var pokers = pattern.pokers;
        var count_map = this.countMap(pokers, laizi);
        var laizi_count = this.laiziCount(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);
        var seed_poker, with_length, with_count;
        var need_seed_poker_count;
        var poker_a = -1, poker_b = -1;
        var poker_number;

        switch (pattern.name) {
            case this.PATTERN_NAME.TRIPLE_WITH_SINGLE:
                seed_poker = pattern.weight - WEIGHT.TRIPLE_WITH_SINGLE;
                need_seed_poker_count = 3;
                with_length = 1;
                with_count = 1;
                break;

            case this.PATTERN_NAME.TRIPLE_WITH_PAIR:
                seed_poker = pattern.weight - WEIGHT.TRIPLE_WITH_PAIR;
                need_seed_poker_count = 3;
                with_length = 2;
                with_count = 1;
                break;

            /*case this.PATTERN_NAME.TRIPLE_WITH_TWO_SINGLE:
                seed_poker = pattern.weight - WEIGHT.TRIPLE_WITH_TWO_SINGLE;
                need_seed_poker_count = 3;
                with_length = 1;
                with_count = 2;
                break;

            case this.PATTERN_NAME.TRIPLE_WITH_TWO_PAIR:
                seed_poker = pattern.weight - WEIGHT.TRIPLE_WITH_TWO_PAIR;
                need_seed_poker_count = 3;
                with_length = 2;
                with_count = 2;
                break;*/

            case this.PATTERN_NAME.FOUR_WITH_TWO_SINGLE:
                seed_poker = pattern.weight - WEIGHT.FOUR_WITH_TWO_SINGLE;
                need_seed_poker_count = 4;
                with_length = 1;
                with_count = 2;
                break;

            case this.PATTERN_NAME.FOUR_WITH_TWO_PAIR:
                seed_poker = pattern.weight - WEIGHT.FOUR_WITH_TWO_PAIR;
                need_seed_poker_count = 4;
                with_length = 2;
                with_count = 2;
                break;
        }

        need_seed_poker_count = need_seed_poker_count - count_map[seed_poker];

        for (poker_number in count_map) {
            if (! count_map.hasOwnProperty(poker_number)) {
                continue;
            }

            poker_number = parseInt(poker_number);
            if (poker_number === seed_poker) {
                continue;
            }

            if (count_map[poker_number] === undefined) {
                count_map[poker_number] = 0;
            }

            if (count_map[poker_number] < with_length) {
                if (poker_a === -1) {
                    poker_a = poker_number;
                } else {
                    poker_b = poker_number;
                }
            }
        }

        for (var i = 0; i < pokers.length; i++) {
            poker_number = this.weightedNumber(pokers[i]);

            if (poker_number === laizi_number) {
                if (need_seed_poker_count > 0) {
                    pokers[i] = this._replaceLaizi(seed_poker);
                    need_seed_poker_count --;
                } else if (laizi_count > 0) {
                    if (poker_b !== -1) {
                        pokers[i] = this._replaceLaizi(poker_b);
                        poker_b = -1;
                    } else if (poker_a !== -1) {
                        pokers[i] = this._replaceLaizi(poker_a);
                        poker_a = -1;
                    } else {
                        // 随便填(2)
                        pokers[i] = this._replaceLaizi(14);
                    }
                }

                laizi_count --;
            }
        }

        this.sortPokersWithLaizi(pokers);

        return pokers;
    };

    /**
     * 替换飞机带【单/双】翅膀
     *
     * @param pattern
     * @param laizi
     * @returns {*}
     * @private
     */
    this._findOriginalPlaneWithWing = function(pattern, laizi) {
        var pokers = pattern.pokers;
        var seed_poker;
        var count_map = this.countMap(pokers, laizi);
        var laizi_number = this.weightedNumber(laizi);
        var wing_length = pattern.length;
        var i, poker_number;
        var candidates = [];

        switch (pattern.name) {
            case this.PATTERN_NAME.PLANE_WITH_WING_SINGLE:
                seed_poker = pattern.weight - WEIGHT.PLANE_WITH_WING_SINGLE;
                break;

            case this.PATTERN_NAME.PLANE_WITH_WING_PAIR:
                seed_poker = pattern.weight - WEIGHT.PLANE_WITH_WING_PAIR;
                break;
        }

        for (i = 0; i < wing_length; i++) {
            poker_number = seed_poker - i;

            if (count_map[poker_number] === undefined) {
                count_map[poker_number] = 0;
            }

            if (count_map[poker_number] < 3) {
                for (var j = 0; j < 3 - count_map[poker_number]; j++) {
                    candidates.push(poker_number);
                }
            }
        }

        for (i = 0; i < pokers.length; i++) {
            poker_number = this.weightedNumber(pokers[i]);

            if (poker_number === laizi_number) {
                // 替换
                if (candidates.length > 0) {
                    pokers[i] = this._replaceLaizi(candidates.pop());
                } else {
                    // 随便填2
                    pokers[i] = this._replaceLaizi(14);
                }
            }
        }

        this.sortPokersWithLaizi(pokers);

        return pokers;
    };

    /**
     * 赖子替换的牌(例如, 7 + 104 = 111, 前端解析的时候, 用赖子花色来渲染)
     *
     * @param poker_number
     * @returns {number}
     * @private
     */
    this._replaceLaizi = function(poker_number) {
        return poker_number % 13 + 104;
    };
};

module.exports = new PokerUtil();