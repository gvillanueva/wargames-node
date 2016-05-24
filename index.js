// Import logger and set log level
var log = require('npmlog');
log.level = process.argv[2] || 'warn';

// Import remaining dependencies
var config = require('./config');
var JsonRpc = require('json-rpc2');
var Game = require('./lib/game.js');
var User = require('./lib/user.js');
var MySQL = require('mysql');
var Crypto = require('crypto');
var bcrypt = require('bcrypt');
const fs = require('fs');

log.verbose(__filename, 'dependencies loaded');

// Create our JSON-RPC server object
var server = JsonRpc.Server.$create({
	'websocket': true,
	'headers': {
		'Access-Control-Allow-Origin': '*'
	}
});

var users = {};// key=authToken, value=User object
var games = {};// key=gameId, value=Game object
 
//games contain expiry timeout
//games contain list of users[];
//games contain list of messages[]?  probably not necessary
var serializeGame = function() {
    
}

/**
 * Validate registered user information and return sha256 authentication token.
 * @param {Object|Object[]} args Arguments of the JSON-RPC.
 * @param {Connection} connection json-rpc2 Connection object
 * @param {Function} callback Response generator callback (err, result).
 */
var login = function(args, connection, callback) {
    var user = args[0];
    
    if (!user || !user.name || !user.password) {
        callback("Bad arguments", null);
        return;
    }

    // Create MySQL connection from config.database object
    var connection = MySQL.createConnection(config.database);
    connection.connect(function(err){
        if (err) {
            callback("Error connecting to database.", null);
            return;
        }
    });

    // Query database for user and validate password against bcrypt hash
    connection.query(
        'SELECT ToGuid(Guid) as Guid, Name, Password, Email FROM User WHERE Name = ?',
        [user.name], function(err, rows, fields){
            if (err) {
                callback("Error querying users table.", null);
                return;
            }

            if (rows.length <= 0 || !bcrypt.compareSync(user.password, rows[0].Password.replace('$2y$', '$2a$'))) {
                callback("Username or password incorrect.", null);
                return;
            }

            // Generate and store user auth-token (random sha256 hash)
            var authToken = Crypto.createHash('sha256').update(Math.random().toString()).digest('hex');
            users[authToken] = new User(user.name);
            callback(null, authToken);
        }
    );
}

/**
 * Logs a user out of the system.
 * @param {Object|Object[]} args Arguments of the JSON-RPC.
 * @param {Connection} connection json-rpc2 Connection object
 * @param {Function} callback Response generator callback (err, result).
 *
 * Leaves any games the user is currently a member of and deletes their
 * authorization token.
 */
var logout = function(args, connection, callback){
    var authToken = args;
    
    if (!authToken) {
        callback('Invalid authToken param', null);
        return;
    }
    
    if (!users[authToken]) {
        callback('No user found with that auth-token', null);
        return;
    }
        
    // If auth-token is found, disconnect from rooms and delete user
    users[authToken].forEach(function(name) {
        game[name].leave(authToken);
    });
    delete users[authToken];
    callback(null, null);    
}

/**
 * Returns a list of games matching the given filter.
 * @param {Object|Object[]} args Arguments of the JSON-RPC.
 * @param {Connection} connection json-rpc2 Connection object
 * @param {Function} callback Response generator callback (err, result).
 */
var listGames = function(args, connection, callback){
    var user = args[0];
    var filters = args[1];

    // Is user authenticated?
    if (!users[user.authToken]) {
        callback('User not authorized.', null);
        return;
    }

    rGames = [];// Returns game objects
    if (filters.myGames == true) {
        users[user.authToken].games.forEach(function(gameName) {
            game = games[gameName];
            rGames.push({
                "id": "",
                "name": game.name,
                "public": game.public,
                "numUsers": (_ => { n = 0; for(k in game.users) n++; return n; })(),
                "maxUsers": game.maxUsers
            });
        });
    }
    else
    {
        for (var gameName in games) {
            if (!games.hasOwnProperty(gameName)) continue;
            var game = games[gameName];
            var numUsers = (_ => { n = 0; for(k in game.users) n++; return n; })();
            if (filters.notFull && numUsers >= game.maxUsers) continue;
            if (filters.notEmpty && numUsers <= 0) continue;
            if (filters.isPublic && !game.public) continue;

            rGames.push({
                "id": "",
                "name": game.name,
                "public": game.public,
                "numUsers": numUsers,
                "maxUsers": game.maxUsers
            });
        };
    }

    // Return games matching filter
    callback(null, rGames);
}

/**
 * Creates a new game using the given arguments.
 * @param {Object|Object[]} args Arguments of the JSON-RPC.
 * @param {Connection} connection json-rpc2 Connection object
 * @param {Function} callback Response generator callback (err, result).
 */
var create = function(args, connection, callback){
    var userArg = args[0];
    var gameArg = args[1];

    // Is user authenticated?
    if (!users[userArg.authToken]) {
        callback('User not authorized.', null);
        return;
    }

    // Validate max users param
    if (!gameArg.maxUsers || gameArg.maxUsers <= 0) {
        callback('Can\'t have a game with no players!', null);
        return;
    }
    
    // Is game name unique?
    if (games[gameArg.name]) {
        callback('A game with that name already exists.', null);
        return;
    }

    // Validate game system
    if (!gameArg.system || !fs.lstatSync(__dirname + "/systems/" + gameArg.system).isDirectory()) {
        callback('system undefined or does not exist.');
        return;
    }

    // Has user exceeded number of concurrent games?

    // Create game
    var game = new Game(gameArg.name, gameArg.maxUsers, gameArg.system);
    
    // Set game timeout
    //game.timeout = setTimeout(serializeGame, config.game.timeout);
    
    // Add game to games object
    games[gameArg.name] = game;

    // Return error = null, result = game.name
    callback(null, game.name);
}

/**
 * Connects a user to the events of a game.
 * @param {Object|Object[]} args Arguments of the JSON-RPC.
 * @param {Connection} connection json-rpc2 Connection object
 * @param {Function} callback Response generator callback (err, result).
 */
var connect = function(args, connection, callback){
    var user = args[0];
    var game = args[1];
    
    // Is user authenticated?
    if (!users[user.authToken]) {
        callback('User not authorized.', null);
        return;
    }
   
    if (!games[game.name]) {
        callback('No game exists by that name.', null);
        return;
    }

    //if games[game.name] || games[game.name].user[user.name]
    // if user not in game
    //  return;
    
    if (!games[game.name].listen(user.authToken, connection, callback))
        return;
    users[user.authToken].games.push(game.name);
}

/**
 * Sends a chat message to all players in a game.
 * @param {Object|Object[]} args Arguments of the JSON-RPC.
 * @param {Connection} connection json-rpc2 Connection object
 * @param {Function} callback Response generator callback (err, result).
 */
var chat = function(args, connection, callback){
    var user = args[0];
    var game = args[1];
    var message = args[2];

    if (!games[game.name]) {
        callback('No game exists by that name.', null);
        return;
    }
    
    games[game.name].chat(user, message, callback);
}

/**
 * Moves a unit in the game.
 * @param {Object|Object[]} args Arguments of the JSON-RPC.
 * @param {Connection} connection json-rpc2 Connection object
 * @param {Function} callback Response generator callback (err, result).
 */
var move = function(args, connection, callback){
    var user = args[0];
    var game = args[1];
    var unit = args[2];
    var move = args[3];

    if (!games[game.name]) {
        callback('No game exists by that name.', null);
        return;
    }

    games[game.name].move(user, unit, move, callback);
}

/** Expose JSON-RPC API */
server.expose('login', login);
server.expose('logout', logout);
server.expose('listGames', listGames);
server.expose('create', create);
server.expose('game.connect', connect);
server.expose('game.chat', chat);
server.expose('game.move', move);

// Finally, listen for incoming connections
server.listen(8000, config.hostname);
