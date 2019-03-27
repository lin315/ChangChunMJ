module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Gate handler that dispatch user to connectors.
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next stemp callback
 *
 */
handler.queryEntry = function(msg, session, next) {
	// get all connectors
	var connectors = this.app.getServersByType('connector');
	if(!connectors || connectors.length === 0) {
		return next(null, UTIL.failResult(ERROR.CONNECTOR_NOT_FOUND));
	}
	// here we just start `ONE` connector server, so we return the connectors[0] 
	var res = connectors[0];

	next(null, UTIL.successResult({
		host: res.clientHost,
		port: res.clientPort
	}));
};