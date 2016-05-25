/**
 * @file Defines the extension points for checkers system
 * @author Giancarlo Villanueva
 */
var Man = require("./man");
var King = require("./king.js");

module.exports = {
    /**
     *
     * @param users
     */
    preStart: function(users) {
    },

    /**
     * Sets up the units required for a game of checkers.
     * @returns {Object} Collection of  Unit-derived objects
     */
    setup: function() {
        var units = {};

        // Set up light units
        for (var r = 0; r < 3; r++)
            for (var m = 0; m < 4; m++)
                units[4 * r + m] = new Man(m * 2 + r % 2, r, 0);

        // Set up dark units
        for (var r = 5; r < 8; r++)
            for (var m = 0; m < 4; m++)
                units[4 * r + m] = new Man(m * 2 + r % 2, r, 0);

        return units;
    }
}
