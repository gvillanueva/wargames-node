var config = require('./config');
var JsonRpc = require('json-rpc2');
var Game = require('./game');
var MySQL = require('mysql');
var Crypto = require('crypto');
var User = require('./user');
var bcrypt = require('bcrypt');

var server = JsonRpc.Server.$create({
	'websocket': true,
	'headers': {
		'Access-Control-Allow-Origin': '*'
	}
});

var users = {};
var games = {};
 
//games contain expiry timeout
//games contain list of users[];
//games contain list of messages[]?  probably not necessary
var serializeGame = function()
{
    
}

// Valid args with user database information, store token in runtime
var login = function(args, opts, callback) {
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

var logout = function(args, opts, callback){
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

var listGames = function(args, opts, callback){
    var user = args[0];
    var filters = args[1];

    // Is user authenticated?
    if (!users[user.authToken]) {
        callback('User not authorized.', null);
        return;
    }

    rGames = [];// Returns game objects
    if (filters.myGames == true) {
        users[user.authToken].games.forEach(function (gameName) {
            game = games[gameName];
            console.log(game);
            rGames.push({
                "id": "",
                "name": game.name,
                "public": game.public,
                "numUsers": (() => { var n = 0; for(k in game.users) n++; return n; })(),
                "maxUsers": game.maxUsers
            });
        });
    }
    else
    {

    }

    // Return games matching filter
    callback(null, rGames);
}

var create = function(args, opts, callback){
    var user = args[0];
    var game = args[1];

    // Is user authenticated?
    if (!users[user.authToken]) {
        callback('User not authorized.', null);
        return;
    }

    // Is game name 
    if (!game.maxUsers || game.maxUsers <= 0) {
        callback('Can\'t have a game with no players!', null);
        return;
    }
    
    // Is game name unique?
    if (games[game.name]) {
        callback('A game with that name already exists.', null);
        return;
    }

    // Has user exceeded number of concurrent games?

    // Create game
    var game = new Game(game.name, game.maxUsers);
    
    // Set game timeout
    //game.timeout = setTimeout(serializeGame, config.game.timeout);
    
    // Add game to games object
    games[game.name] = game;
    callback(null, game);
}

var connect = function(args, conn, callback){
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
    
    if (!games[game.name].listen(user.authToken, conn, callback))
        return;
    users[user.authToken].games.push(game.name);
}

var chat = function(args, opts, callback){
    var user = args[0];
    var game = args[1];
    var message = args[2];

    if (!games[game.name]) {
        callback('No game exists by that name.', null);
        return;
    }
    
    games[game.name].chat(user, message, callback);
}

var move = function(args, opts, callback){
    var user = args[0];
    var game = args[1];
    var unit = args[2];
    var move = args[3];

    if (!games[game.name]) {
        callback('No game exists by that name.', null);
        return;
    }
    
    games[game.name].chat(user, game, unit, move, callback);
}

// Expose JSON-RPC API
server.expose('login', login);
server.expose('logout', logout);
server.expose('listGames', listGames);
server.expose('create', create);
server.expose('game.connect', connect);
server.expose('game.chat', chat);
//server.expose('game.users', users)

// Finally, listen for incoming connections
server.listen(8000, config.hostname);
