// REMEMBER: USER'S AUTH-TOKEN ARE SACRED
// i.e. Do not transmit them, or others client will be able to spoof that user.

/**
 * Defines generic game logic and extension points for specific game logic.
 * @module game
 */

// Import dependent modules
const EventEmitter = require("events");
const log = require("npmlog");
const NodeVM = require("vm2").NodeVM;
const fs = require("fs");
const WargamesError = require("./systems/wargames/error.js");
const User = require("./user.js");
const Uuid = require("node-uuid");

log.verbose(__filename, "dependent modules loaded");

var games = {};// key=gameId, value=Game object

/**
 * Represents a game.
 * @param {String} name Name that will show up in browser.
 * @param {String} system Name of the rule's system.
 * @param {Number} maxUsers Maximum number of players.
 * @constructor
 */
function Game(name, maxUsers, system) {
    EventEmitter.call(this);
    this.name = name;
    this.public = true;
    this.maxUsers = maxUsers;
    this.units = {};
    this.users = {};

    var options = {
        timeout: 1000,
        sandbox: {},
        require:true,
        requireExternal: true,
        requireNative: [],
        requirePath: "./"
    };

    // Load untrusted code into sandbox
    this.nvm = new NodeVM(options);
    var systemPath = __dirname + "/systems/" + system + "/setup.js";
    this.system = this.nvm.run(fs.readFileSync(systemPath, "utf8"), systemPath);

    // Call system code to perform pre-game setup
    this.units = this.nvm.call(this.system.setup, null);
}

// Inherit from EventEmitter
Game.prototype = Object.create(EventEmitter.prototype);
Game.prototype.constructor = Game;

/**
 * Subscribes a client to the events of the game.
 * @param {String} authToken sha256 hash representing an authenticated client.
 * @param {Object} connection Connection object to communicate with client.
 * @param {Object} callback Return channel for this call.
 * @returns {boolean} Always returns true;
 */
Game.prototype.listen = function(authToken, connection, callback) {
    if (this.users.length >= this.maxUsers) {
        callback("Game is full", null);
        return false;
    }

    connection.stream(function(){
        console.log('connection ended');
    });
    console.log('connection started');

    // Create new user object
    var user = {
        id: Uuid.v4(),
        connection: connection,
        sendEvent: function (method, data) {
            connection.call(event, data);
        }
    };

    // Inform existing users of new user
    this.emit('event', 'joined', user.id );

    // Hook up events for this client
    this.on('event', user.sendEvent);
    this.users[authToken] = user;
    return true;
}

/**
 * Unsubscribes/disconnects a client from the game.
 * @param {String} authToken sha256 hash representing an authenticated client.
 * @param {Object} callback Channel to client.
 */
Game.prototype.leave = function(authToken, callback) {
    if (!this.users[authToken]){
        callback("Invalid user", null);
        return;
    }

    // Create local reference to user
    var user = this.user[authToken];
    this.removeListener('event', user.sendEvent);
    this.emit('event', 'left', user.id);
    //delete? this.users[authToken]
}

/**
 *
 * @param user
 * @param message
 * @param callback
 */
Game.prototype.chat = function(user, message, callback) {
    if (!this.users[user.authToken]){
        callback("Invalid authToken", null);
        return;
    }

    this.emit('event', 'ch{data: [user.name, message.text]})
}

/**
 *
 * @param user
 * @param unit
 * @param move
 * @param callback
 */
Game.prototype.move = function(user, unit, move, callback) {
    try {
        var a = units[unit].move();
        this.emit('moved', {data: [user, unit, move]});
        callback(null, true);
    }
    catch (e) {
        if (e instanceof WargamesError)
            callback(e, null);
        else
            callback(new Error("An unknown error has occurred."));
    }
    this.emit('moved', {data: [user, unit, move]});
}


var JsonRpc = {
    /**
     * Returns a list of games matching the given filter.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    listGames: function (args, connection, callback) {
        var user = args[0];
        var filters = args[1];

        // Is user authenticated?
        if (!users[user.authToken]) {
            callback('User not authorized.', null);
            return;
        }

        function countUsers(users){
            var n = 0;
            for(k in users) n++;
            return n;
        }

        rGames = [];// Returns game objects
        if (filters.myGames == true) {
            users[user.authToken].games.forEach(function (gameName) {
                game = games[gameName];
                rGames.push({
                    "id": "",
                    "name": game.name,
                    "public": game.public,
                    "numUsers": countUsers(game.users),
                    "maxUsers": game.maxUsers
                });
            });
        }
        else {
            for (var gameName in games) {
                if (!games.hasOwnProperty(gameName)) continue;
                var game = games[gameName];
                var numUsers = countUsers(game.users);
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
            }
            ;
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
    listSystems: function (args, connection, callback) {
        // Validate game system
        var systemsPath = __dirname + "/lib/systems/";
        var files = fs.readdirSync(systemsPath);
        var systems = [];

        for (var i = 0; i < files.length; i++)
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
    create: function (args, connection, callback) {
        var userArg = args.user || args[0];
        var gameArg = args.game || args[1];

        // Is user authenticated?
        if (!User.isAuthTokenValid(userArg.authToken)) {
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
    },

    /**
     * Connects a user to the events of a game.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    connect: function (args, connection, callback) {
        var user = args.user || args[0];
        var game = args.game || args[1];

        // Is user authenticated?
        if (!User.isAuthTokenValid(user.authToken)) {
            callback('User not authorized.', null);
            return;
        }

        if (!games[game.name]) {
            callback('No game exists by that name.', null);
            return;
        }

        // Subscribe user to game's WebSocket events
        if (!games[game.name].listen(user.authToken, connection, callback))
            return;
    },

    /**
     * Sends a chat message to all players in a game.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    chat: function (args, connection, callback) {
        var user = args.user || args[0];
        var game = args.game || args[1];
        var message = args.message || args[2];

        if (!games[game.name]) {
            callback('No game exists by that name.', null);
            return;
        }

        games[game.name].chat(user, message, callback);
    },

    /**
     * Moves a unit in the game.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    move: function (args, connection, callback) {
        var user = args.user || args[0];
        var game = args.game || args[1];
        var unit = args.unit || args[2];
        var move = args.move || args[3];

        if (!games[game.name]) {
            callback('No game exists by that name.', null);
            return;
        }

        games[game.name].move(user, unit, move, callback);
    }
}

exports.Game = Game;
exports.JsonRpc = JsonRpc;
