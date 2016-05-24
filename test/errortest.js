/**
 * @file Defines unit tests for the WargamesError class
 * @author Giancarlo Villanueva
 */

var assert = require("chai").assert;
var WargamesError = require("../systems/wargames/error.js");

describe("WargamesError", function() {
    it("should be an instance of Error", function() {
        assert.instanceOf(new WargamesError(), Error);
    });
    it("should be an instance of WargamesError", function() {
        assert.instanceOf(new WargamesError(), WargamesError);
    });
});
