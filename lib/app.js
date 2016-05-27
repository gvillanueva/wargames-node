const MySQL = require("mysql");
const Crypto = require("crypto");
const bcrypt = require("bcrypt");
const config = require('../config.js');
const User = require("./user.js");
const Game = require("./game.js");
const fs = require("fs");

var users = {};// key=authToken, value=User object
var games = {};// key=gameId, value=Game object

module.exports.Internal = {
    isAuthTokenValid: function(authToken) {
        return users.hasOwnProperty(authToken);
    }
};

module.exports.Rpc = {
    /**
     * Validate registered user information and return sha256 authentication token.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    login: function(args, connection, callback) {
        var user = args.user || args[0];

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
        });
    },

    /**
     * Logs a user out of the system.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     *
     * Leaves any games the user is currently a member of and deletes their
     * authorization token.
     */
    logout: function(args, connection, callback){
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
    },

    /**
     * Returns a list of games matching the given filter.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    listGames: function(args, connection, callback){
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
    },

    /**
     * Returns a list of the installed systems.
     * @param args - No arguments required
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    listSystems: function(args, connection, callback) {
        // Validate game system
        var systemsPath = __dirname + "/lib/systems/";
        var files = fs.readdirSync(systemsPath);
        var systems = [];

        for(var i = 0; i < files.length; i++)
            if (files[i] != '.')
                if (fs.statSync(systemsPath + "/" + files[i]).isDirectory() && files[i] != "wargames")
                    systems.push(files[i]);

        callback(null, systems);
    },

    /**
     * Creates a new game using the given arguments.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    create: function(args, connection, callback){
        var userArg = args.user || args[0];
        var gameArg = args.game || args[1];

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
        var game = new Game.Game(gameArg.name, gameArg.maxUsers, gameArg.system);

        // Set game timeout
        //game.timeout = setTimeout(serializeGame, config.game.timeout);

        // Add game to games object
        games[gameArg.name] = game;

        // Return error = null, result = game.name
        callback(null, game.name);
    }
}

// dummy login
module.exports.Rpc.login = function(args, connection, callback) {
    var user = args.user || args[0];

    if (!user || !user.name || !user.password) {
        callback("Bad arguments", null);
        return;
    }

    if (/*rows.length <= 0 ||*/ !require("bcrypt").compareSync(user.password, "$2y$10$7ZyTwIR/gRDxH1POzdybhOW8StiPLf32kYf.UaP17UBqko/jRjF.i".replace('$2y$', '$2a$'))) {
        callback("Username or password incorrect.", null);
        return;
    }

    // Generate and store user auth-token (random sha256 hash)
    var authToken = require("crypto").createHash('sha256').update(Math.random().toString()).digest('hex');
    users[authToken] = new User(user.name);
    callback(null, authToken);
}

