/**
 * Created by leo on 11/24/2017.
 */
/**
 *  模块管理器
 *  负责加载与缓存模块，供其他程序部分调用
 * （后续需要增加，模块依赖管理功能，目前会根据配置文件顺序加载）
 *
 */
var ModuleManager = function() {
    this.config_path = '../config/modules.config.js';
    this.modules = {};

    /**
     * 初始化
     *
     * @param app: 应用
     * @param callback: 回调
     */
    this.init = function(app, callback) {
        app.module_manager = this;

        var module_configs = require(this.config_path);
        var total_count = module_configs.length;
        var current_index = 0;

        // 先加载所有模块
        for (var i = 0; i < total_count; i++) {
            var module_config = module_configs[i];
            var module_name = module_config.name;
            this.modules[module_name] = require('./' + module_name + '/index');
        }

        // 依次初始化
        var self = this;
        var doLoadModule = function() {
            if (current_index >= total_count) {
                return callback(null);
            }

            var module_config = module_configs[current_index];
            var module_name = module_config.name;

            current_index ++;

            try {
                var module = self.modules[module_name];

                // 初始化模块
                module.init(app, module_config, function(err) {
                    if (err) {
                    }

                    doLoadModule();
                });
            }
            catch (e) {
                console.error('Can not find module: ' + module_name + '\n' + e.message);

                doLoadModule();
            }
        };

        // 开始加载
        doLoadModule();
    };

    /**
     * 获取模块
     *
     * @param module_name: 模块名称
     * @returns {*}: 模块
     */
    this.getModule = function(module_name) {
        return this.modules[module_name];
    };
};

global.module_manager = new ModuleManager();
module.exports = global.module_manager;