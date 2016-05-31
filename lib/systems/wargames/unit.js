/**
 * @file Defines the base class for units in the Wargames framework.
 * @author Giancarlo Villanueva
 */

/**
 *
 * @param x
 * @param y
 * @param z
 * @constructor
 */
function WargamesUnit(x, y, z, image) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.image = image;
    this.game = null;
}

WargamesUnit.prototype.move = function(x,y,z) {
    console.log("WargamesUnit.move");

    this.x = x;
    this.y = y;
    this.z = z;
}

module.exports = WargamesUnit;
