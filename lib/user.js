var method = User.prototype;
var log = require('npmlog');

log.verbose(__filename, 'dependent modules loaded');

function User(name) {
    this.name = name;
    this.games = [];
}

module.exports = User;