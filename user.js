var method = User.prototype;

function User(name) {
    this.name = name;
    this.games = [];
}

module.exports = User;