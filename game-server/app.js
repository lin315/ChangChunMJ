var pomelo = require('pomelo');

global.CONST = require('../shared/config/CONST');
global.ERROR = require('../shared/config/ERROR');
global.UTIL = require('../shared/utils/util');

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', '长春麻将');

var module_manager = require('../shared/modules/module_manager');
module_manager.init(app, function() {
    // app configuration
    app.configure('production|development', 'gate', function(){
        app.set('connectorConfig',
            {
                connector : pomelo.connectors.hybridconnector,
                heartbeat : 5
            });
    });
    app.configure('production|development', 'connector', function() {
        app.set('connectorConfig',
            {
                connector : pomelo.connectors.hybridconnector,
                heartbeat : 5
            });
    });
    app.configure('production|development', 'hall', function() {
        var hall_engine = require('./app/servers/hall/logic/hall_engine');
        hall_engine.init(app);

        app.set('hall_engine', hall_engine);
    });
    app.configure('production|development', 'game', function() {
        var game_engine = require('./app/servers/game/logic/game_engine');
        game_engine.init(app);

        app.set('game_engine', game_engine);
    });

    // start app
    app.start();

    process.on('uncaughtException', function (err) {
        console.error(' Caught exception: ' + err.stack);
    });
});