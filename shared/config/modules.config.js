/**
 * Created by leo on 11/24/2017.
 */

var CONST = require('./CONST');

module.exports = [
    /**
     * 消息队列管理
     *
     */
    {
        name: CONST.MODULE.EVENT,
        redis: {
            HOST: 'localhost',
            PORT: 6379,
            DB: 4
        },
        log: true
    },

    /**
     * 缓存管理模块
     *
     */
    {
        name: CONST.MODULE.CACHE,
        type: 'redis',
        redis: {
            HOST: 'localhost',
            PORT: 6379,
            DB: 4
        },
        log: true
    },

    /**
     * 锁管理模块
     */
    {
        name: CONST.MODULE.LOCK,
        type: 'cache',
        log: true
    },

    /**
     * mysql模块
     */
    {
        name: CONST.MODULE.MYSQL,
        HOST: 'localhost',
        USER: 'root',
        //PASSWORD: '302$#$@01b0456982b2#()@$88',
        PASSWORD: '',
        DB: 'changchun',
        PORT: 3306,
        CHARSET: 'utf8mb4',
        log: true
    },

    /**
     * 数据模块设置
     */
    {
        name: CONST.MODULE.DATA,
        type: 'mysql',
        use_cache: false,
        log: true
    },

    /**
     * 加载模块设置
     */
    {
        name: CONST.MODULE.LOADER,
        models: CONST.MODEL,
        log: true
    },

    /**
     * I18N
     */
    {
        name: CONST.MODULE.LANG,
        log: true
    },

    /**
     * Auth认证管理
     */
    {
        name: CONST.MODULE.AUTH,
        log: true
    },

    /**
     * WEB API管理
     *
     */
    {
        name: CONST.MODULE.API,
        log: true
    },

    /**
     * 支付管理
     *
     */
    {
        name: CONST.MODULE.PAY,
        log: true,
        debug: false,
    }
];