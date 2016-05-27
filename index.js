// Import logger and set log level
var log = require('npmlog');
log.level = process.argv[2] || 'warn';

// Import remaining dependencies
var JsonRpc = require('json-rpc2');
const User = require("./lib/user.js");
const Game = require("./lib/game.js");
const config = require("./config.js");

log.verbose(__filename, 'dependencies loaded');

// Create our JSON-RPC server object
var server = JsonRpc.Server.$create({
	'websocket': true,
	'headers': {
		'Access-Control-Allow-Origin': '*'
	}
});

/** Expose JSON-RPC API */
server.expose("User", User.JsonRpc);
server.expose("Game", Game.JsonRpc);

// Finally, listen for incoming connections
server.listen(8000, config.hostname);
