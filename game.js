var method = Game.prototype;

function Game(name, maxPlayers) {
    this.name = name;
    this.maxPlayers = maxPlayers;
}

module.exports = Game;