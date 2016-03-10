var config = require('./config');
var Events = require('events');
var Uuid = require('node-uuid');
var JsonRpc = require('json-rpc2');
var Game = require('./game');

var eventEmitter = new Events.EventEmitter();
var server = JsonRpc.Server.$create({
	'websocket': true,
	'headers': {
		'Access-Control-Allow-Origin': '*'
	}
});

var games = {};
//games contain expiry timeout
//games contain list of users[];
//games contain list of messages[]?  probably not necessary

var create = function(args, opts, callback){
    var user = args[0];
    var gameName = args[1];

    // Is game name unique?
    if (games[gameName]) {
        callback('game already exists', null);
        return;
    }

    // Has user exceeded number of concurrent games?

    // Create game
    var game = new Game(gameName, 5);
    
    // Set game timeout
    //game.timeout = setTimeout(serializeGame, config.game.timeout);
    
    // Add game to games object
    games[gameName] = game;
    callback(null, game);
}

var listen = function(args, opts, callback){
    var user = args[0];
    var game = args[1];

    //if games[game.name] || games[game.name].user[user.name]
    // if user not in game
    //  return;
    console.log('connection started');
    
    var chat = function(event){
        opts.call('chat', event.data);
        //opts.call('game.chat', event.data);
    }
    var joined = function(event){
        opts.call('joined', event.data);
    }
    var left = function(event){
        opts.call('left', event.data);
    }

    eventEmitter.emit('joined', {data: args});

    // Register events for 'client' peer notifications
    eventEmitter.on('chat', chat);
    //eventEmitter.on('gameName.chat', chat);
    eventEmitter.on('joined', joined);
    eventEmitter.on('left', left);
    
    opts.stream(function(){
        console.log('connection ended');
        eventEmitter.removeListener('chat', chat);
        eventEmitter.removeListener('joined', joined);
        eventEmitter.removeListener('left', left);
        eventEmitter.emit('left', {data: args});
    });

    // Leave connection open
    callback(null);
}

var chat = function(args, opts, callback){
    // userObj
    // gameObj
    // messageObj
    // if user not in game
    //  return;
    
    //console.log(args);
    eventEmitter.emit('chat', {data: args});
    //eventEmitter.emit(game.name + '.chat', {data: user.name + ": " + message.text});
    //games[game.id].resetTimeout();
}

// Expose JSON-RPC API
server.expose('game.create', create)
server.expose('game.listen', listen);
server.expose('game.chat', chat);
//server.expose('game.users', users)

// Finally, listen for incoming connections
server.listen(8000, config.hostname);