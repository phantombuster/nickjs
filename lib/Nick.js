'use strict';

var es8 = true

try {
	eval("let esTest = (async (a) => { return `${a}` }); esTest(1);")
} catch (e) {
	es8 = false
}

if (es8) {
	module.exports = require("./es8/Nick")
} else {
	module.exports = require("./es5/Nick")
}
