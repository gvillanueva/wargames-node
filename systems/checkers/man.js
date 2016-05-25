/**
 * @file Defines the behavior of the Man in checkers
 * @author Giancarlo Villanueva
 */
/**
 * Created by cvillanueva on 5/17/2016.
 */
var WargamesUnit = require("../wargames/unit.js");
var WargamesError = require("../wargames/error.js");

Man.prototype = Object.create(WargamesUnit);
Man.prototype.constructor = Man;

function Man(x,y,z) {
    WargamesUnit.prototype.constructor.call(this,x,y,z);
}

/**
 *
 * @param x X-coordinate of unit's destination.
 * @param y Y-coordinate of unit's destination.
 * @param z Z-coordinate of unit's destination.
 */
Man.prototype.move = function(x,y,z) {
    WargamesUnit.prototype.move.call(this,x,y,z);
    console.log("Man.move()");
    if (x == this.x || y == this.y)
        throw new WargamesError("Invalid move: man must move diagonally");
}

module.exports = Man;
