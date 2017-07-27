const _ = require("lodash")
const TabDriver = require("./TabDriver")

class BrowserDriver {

	constructor(options) {
		this._options = options
	}

	exit(code) {
		phantom.exit(code)
	}

	_initialize(callback) {
		// We're already in a PhantomJS environment
		// The browser is already initialized
		// The options will be applied for every new tab
		callback(null)
	}

	_newTabDriver(uniqueTabId, callback) {
		callback(null, new TabDriver(uniqueTabId, this._options))
	}

}

module.exports = BrowserDriver
