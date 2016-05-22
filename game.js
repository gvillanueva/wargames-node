/**
 * Defines generic game logic and extension points for specific game logic.
 * @module game
 */

// Import dependent modules
var Events = require("events");
var log = require("npmlog");
var NodeVM = require("vm2").NodeVM;
var fs = require("fs");

log.verbose(__filename, "dependent modules loaded");

/**
 * Represents a game.
 * @param {String} name Name that will show up in browser.
 * @param {String} system Name of the rule's system.
 * @param {Number} maxUsers Maximum number of players.
 * @constructor
 */
function Game(name, maxUsers, system) {
    this.name = name;
    this.public = true;
    this.maxUsers = maxUsers;
    this.events = new Events.EventEmitter();
    this.units = {};

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
    this.system = this.nvm.run(fs.readFileSync(systemPath, "utf8"));

    // Call system code to perform pre-game setup
    this.units = this.nvm.call(this.system.setup, null);

    log.verbose(this.units);
}

/**
 * Subscribes a client to the events of the game.
 * @param {String} authToken sha256 hash representing an authenticated client.
 * @param {Object} connection Connection object to communicate with client.
 * @param {Object} callback Return channel for this call.
 * @returns {boolean} Always returns true;
 */
Game.prototype.listen = function(authToken, connection, callback)
{
    if (this.users.length >= this.maxUsers) {
        callback("Game is full", null);
        return false;
    }
    
    connection.stream(function(){
        console.log('connection ended');
    });
    console.log('connection started');

    var chatted = function(event){
        connection.call('chatted', event.data);
    }
    var moved = function(event){
        connection.call('moved', event.data);
    }
    var joined = function(event){
        connection.call('joined', event.data);
    }
    var left = function(event){
        connection.call('left', event.data);
    }
    this.events.emit('joined', authToken);

    // hook up events for this client
    this.events.on('chatted', chatted);
    this.events.on('moved', moved);
    this.events.on('joined', joined);
    this.events.on('left', left);

    this.users[authToken] = connection;
    return true;
}

/**
 * Unsubscribes/disconnects a client from the game.
 * @param {String} authToken sha256 hash representing an authenticated client.
 * @param {Object} callback Channel to client.
 */
Game.prototype.leave = function(authToken, callback)
{    
    if (!this.users[authToken]){
        callback("Invalid authToken", null);
        return;        
    }

    this.events.removeListener('chatted', chatted);
    this.events.removeListener('moved', moved);
    this.events.removeListener('joined', joined);
    this.events.removeListener('left', left);
    this.events.emit('left', authToken);        
}

/**
 *
 * @param user
 * @param message
 * @param callback
 */
Game.prototype.chat = function(user, message, callback)
{
    if (!this.users[user.authToken]){
        callback("Invalid authToken", null);
        return;        
    }

    this.events.emit('chatted', {data: [user.name, message.text]})
}

/**
 *
 * @param user
 * @param unit
 * @param move
 * @param callback
 */
Game.prototype.move = function(user, unit, move, callback)
{
    this.events.emit('moved', {data: [user, unit, move]});
}

/** Constructor for the game class. */
module.exports = Game;