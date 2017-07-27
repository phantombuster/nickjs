'use strict';

var es8 = true

try {
	eval("let esTest = (async (a) => { return `${a}` }); esTest(1);")
} catch (e) {
	console.log("not es8: " + e)
	es8 = false
}

if (es8) {
	console.log("It's ES8! Yay!")
	module.exports = require("./es8/Nick")
} else {
	console.log("It's ES5 (:")
	module.exports = require("./es5/Nick")
}
