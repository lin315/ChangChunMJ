var poker_util = require('./poker_util');

var pokers = {};

// 火箭测试
pokers.rocket = [
	[52, 53],
	[51, 52],
	[51, 50]
];
// 炸弹测试
pokers.bomb = [
	[0, 13, 26, 39],
	[2, 15, 28, 30],
	[2, 15, 28, 31]
];
// 4带2单测试
pokers.fourWithTwoSingle = [
	[0, 13, 26, 39, 28],
	[0, 13, 26, 39, 29],
	[0, 13, 26, 38, 52]
];
// 4带2双测试
pokers.fourWithTwoSingle = [
	[0, 13, 26, 39, 15, 28],
	[0, 13, 26, 39, 15, 29],
	[0, 13, 26, 38, 14, 52]
];
// 3带2单测试
pokers.tripleWithTwoSingle = [
	[2, 15, 28, 14, 28],
	[4, 17, 30, 43, 49]
];
// 3带2双测试
pokers.tripleWithTwoPair = [
	//[2, 15, 28, 14, 28, 18, 36],
	//[4, 17, 30, 43, 49, 21, 41],
	//[36, 35, 21, 7, 33, 45, 17],
	[23, 36, 50, 48, 20, 32, 18]
];

// 飞机带单牌翅膀测试
pokers.planeWithWingSingle = [
	[2, 15, 28, 3, 16, 29, 48, 25],
	[4,4,4,2,5,5,5,49],
	[3,3,3,4,4,4,3,2],
	[3,3,3,3,4,4,8,8]
];
// 飞机带双牌翅膀测试
pokers.planeWithWingPair = [
	[2, 15, 28, 3, 16, 29, 48, 25, 25, 48],
	[4,4,30,3,3,3,5,5,8,8]
];
// 三顺
pokers.tripleStraight = [
	//[45,32,19,33,20,7],
];
// 双顺
pokers.pairStraight = [
    [7,46,5,31,34,8]
];
// 顺子
pokers.straight = [
	// [15,29,43,18,19],
    [6,13,12,11,9],
    [34,47,12,11,23,9]
];
// 三带一单牌
pokers.tripleWithSingle = [
	//[16,29,42,15],
	[14,0,0,12]
];
// 三带一对子
pokers.tripleWithPair = [
	[10, 23, 36, 49, 8]
];
// 对子测试
pokers.pair = [
	[8, 53]
];

var laizi = [
	0,
	1,
	2,
	8,
	4
]

for (var i = 0; i < pokers.pair.length; i++) {
	var group = pokers.pair[i];
	var count_map = poker_util.countMap(group, 8);
	var laizi_count = poker_util.laiziCount(group, 8);
	var answer = poker_util.isPair(count_map, laizi_count);
	console.log(group, answer, laizi_count, count_map);
}