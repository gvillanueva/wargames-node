/**
 * Defines generic game logic and extension points for specific game logic.
 * @module game
 */

// Import dependent modules
const EventEmitter = require("events");
const util = require("util");
const log = require("npmlog");
const NodeVM = require("vm2").NodeVM;
const fs = require("fs");
const WargamesError = require("./systems/wargames/error.js");
const App = require("./app.js").Internal;
const Uuid = require("node-uuid");

log.verbose(__filename, "dependent modules loaded");



module.exports.Rpc = {
    /**
     * Connects a user to the events of a game.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    connect: function(args, connection, callback) {
        var user = args.user || args[0];
        var game = args.game || args[1];

        // Is user authenticated?
        if (!App.isAuthTokenValid(user.authToken)) {
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
        users[user.authToken].games.push(game.name);
    },

    /**
     * Sends a chat message to all players in a game.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    chat: function(args, connection, callback) {
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
    move: function(args, connection, callback) {
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
