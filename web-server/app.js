var fs = require('fs');
var url = require('url');

global.CONST = require('../shared/config/CONST');
global.ERROR = require('../shared/config/ERROR');
global.UTIL = require('../shared/utils/util');

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var xmlBodyParser = require('express-xml-parser');

app.configure(function(){
  app.use(express.methodOverride());

  app.use(express.urlencoded());
  app.use(express.json());

  // 解析XML
  app.use('/weixin', xmlBodyParser({
      type: 'text/xml',
      limit: '1mb',
      explicitArray : false
  }));

  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

/*
 设置跨域访问
 */
app.all('/api/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    res.header('Last-Modified', (new Date()).toUTCString());
  /*res.header("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
   res.header("Pragma", "no-cache"); // HTTP 1.0.
   res.header("Expires", "0"); // Proxies.
   */
    next();
});

/**
 * 解析w文件
 */
app.get('*.w', function (request, response) {
    var pathname = url.parse(request.url).pathname;
    var realPath = process.cwd() + pathname;
    fs.exists(realPath, function (exists) {
        if (!exists) {
            response.writeHead(404, {'Content-Type': 'text/plain'});
            response.write("This request URL " + pathname + " was not found on this server.");
            response.end();
        }
        else {
            fs.readFile(realPath, "binary", function(err, file) {
                if (err) {
                    response.writeHead(500, {'Content-Type': 'text/plain'});
                    response.end(err);
                } else {
                    response.writeHead(200, {'Content-Type': 'text/html'});
                    response.write(file, "binary");
                    response.end();
                }
            });
        }
    });
});

// 启动服务器
console.log("Web server has started.\nPlease log on http://127.0.0.1:3001/index.html");
app.listen(3001);

process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
});

var module_manager = require('../shared/modules/module_manager');

// 模块初始化
module_manager.init(app, function() {
    var game_api = require('./api/game/game_api');
    var admin_api = require('./api/admin/admin_api');
    var dealer_api = require('./api/dealer/dealer_api');

    game_api.init(app);
    admin_api.init(app);
    dealer_api.init(app);
});