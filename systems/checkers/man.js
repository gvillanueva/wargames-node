/**
 * Created by cvillanueva on 5/17/2016.
 */
var WargamesUnit = require("../wargames/unit.js");

Man.prototype = Object.create(WargamesUnit);
Man.prototype.constructor = Man;

function Man(x,y,z) {
    WargamesUnit.prototype.constructor.call(this,x,y,z);
}

/**
 *
 * @param x
 * @param y
 * @param z
 */
Man.prototype.move = function(x,y,z) {
    WargamesUnit.prototype.move.call(this,x,y,z);
    console.log("Man.move()");
}

Man.hierarchy = function() {
    console.log(this);
    var proto = Man.prototype;
    while(proto) {
        console.log(proto.toString());
        proto = proto.prototype;
    }
}

module.exports = Man;