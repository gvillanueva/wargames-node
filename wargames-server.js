var config = require('./config');
var Events = require('events');
var Uuid = require('node-uuid');
var JsonRpc = require('json-rpc2');

var eventEmitter = new Events.EventEmitter();
var server = JsonRpc.Server.$create({
	'websocket': true,
	'headers': {
		'Access-Control-Allow-Origin': '*'
	}
});

//var games[];
//games contain expiry timeout
//games contain list of users[];
//games contain list of messages[]?  probably not necessary

var create = function(args, opts, callback){
    // User exceeded number of concurrent games?
    // Game name unique?

    // Create game
    //var game = new Game();

    // Set expiration of game (1800000ms = 30m * 60s * 1000ms)
    //game.timeout = setTimeout(serializeGame, 1800000);
}

var listen = function(args, opts, callback){
    // userObj
    // gameObj
    // if user not in game
    //  return;
    console.log('connection started');
    
    var chat = function(event){
        opts.call('chat', event.data);
        //opts.call('game.chat', event.data);
    }

    // Register events for 'client' peer notifications
    eventEmitter.on('chat', chat);
    //eventEmitter.on('gameName.chat', chat);
    opts.stream(function(){
        console.log('connection ended');
        eventEmitter.removeListener('chat', chat);
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
    console.log(args);
    eventEmitter.emit('chat', {data: args});
    //eventEmitter.emit(game.name + '.chat', {data: user.name + ": " + message.text});
    //games[game.id].resetTimeout();
}

// Expose JSON-RPC API
server.expose('game.create', create)
server.expose('game.listen', listen);
server.expose('game.chat', chat);

// Finally, listen for incoming connections
server.listen(8000, config.hostname);