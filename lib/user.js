/**
 * @file Defines the User class and JSON-RPC API
 * @author Giancarlo Villanueva
 */

const MySQL = require("mysql");
const Crypto = require("crypto");
const bcrypt = require("bcrypt");
const config = require('../config.js');
var log = require('npmlog');

log.verbose(__filename, 'dependent modules loaded');

var users = {};// key=authToken, value=User object

function User(name) {
    this.name = name;
    this.games = [];
}

exports.User = User;

exports.isAuthTokenValid = function(authToken) {
    return users.hasOwnProperty(authToken);
}

var JsonRpc = {
    /**
     * Validate registered user information and return sha256 authentication token.
     * @param {Object|Object[]} args Arguments of the JSON-RPC.
     * @param {Connection} connection json-rpc2 Connection object
     * @param {Function} callback Response generator callback (err, result).
     */
    login: function (args, connection, callback) {
        var user = args.user || args[0];

        if (!user || !user.name || !user.password) {
            callback("Bad arguments", null);
            return;
        }

        // Create MySQL connection from config.database object
        var connection = MySQL.createConnection(config.database);
        connection.connect(function (err) {
            if (err) {
                callback("Error connecting to database.", null);
                return;
            }

            // Query database for user and validate password against bcrypt hash
            connection.query(
                'SELECT ToGuid(Guid) as Guid, Name, Password, Email FROM User WHERE Name = ?',
                [user.name], function (err, rows, fields) {
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
    logout: function (args, connection, callback) {
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
        users[authToken].forEach(function (name) {
            game[name].leave(authToken);
        });
        delete users[authToken];
        callback(null, null);
    },
}

exports.JsonRpc = JsonRpc;
