var method = Game.prototype;
var Events = require('events');

function Game(name, maxUsers) {
    this.name = name;
    this.public = true;
    this.users = {};
    this.maxUsers = maxUsers;
    this.events = new Events.EventEmitter();
}    

method.listen = function(authToken, connection, callback)
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

method.leave = function(authToken, callback)
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

method.chat = function(user, message, callback)
{
    if (!this.users[user.authToken]){
        callback("Invalid authToken", null);
        return;        
    }

    this.events.emit('chatted', {data: [user.name, message.text]})
}

method.move = function(user, unit, move, callback)
{
    this.events.emit('moved', {data: [user, unit, move]});
}

module.exports = Game;