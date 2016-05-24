/**
 * @file Defines standard exception types for the Wargames framework
 * @author Giancarlo Villanueva
 */

WargamesError.prototype = Object.create(Error.prototype);
WargamesError.prototype.constructor = WargamesError;

function WargamesError(message) {
    Error.captureStackTrace(this, this.constructor);
    this.message = message;
}

module.exports = WargamesError;
