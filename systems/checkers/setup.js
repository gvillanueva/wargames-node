/**
 * Created by cvillanueva on 5/17/2016.
 */
var Man = require("./man");
var King = require("./king.js");

module.exports = {
    preStart: function(users) {
        if (users.length != 2)
            
    }
    setup: function() {
        var units = {};
        for (var r = 0; r < 3; r++)
            for (var m = 0; m < 4; m++)
                units[4 * r + m] = new Man(m * 2 + r % 2, r, 0);

        for (var r = 5; r < 8; r++)
            for (var m = 0; m < 4; m++)
                units[4 * r + m] = new Man(m * 2 + r % 2, r, 0);

        return units;
    }
}
