/**
 * Created by leo on 3/13/2018.
 */

function LoaderModule() {
    this.app = null;
    this.config = null;

    this.loadModels = function(models) {
        var model_db = null;

        for (var key in models) {
            var model_name = models[key];

            try {
                model_db = require('../../models/' + model_name + '_model');
            }
            catch (e) {
                if (this.config.log) {
                    console.error('Error loading Model at ModelLoader: ' + model_name);
                }
            }
        }
    };

    this.init = function(app, config, callback) {
        callback = callback || function() {};

        this.app = app;
        this.config = config;

        this.loadModels(this.config.models);

        callback(null);
    };
}

module.exports = new LoaderModule();