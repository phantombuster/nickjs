// Properties starting with _ are meant for the higher-level Nick tab
// Properties starting with __ are private to the driver
// Read-only properties should be configured as such

// import tab-specific things...

class TabDriver {

	constructor(options) {
		// Should initialize the tab driver
		// This is called from _newTabDriver() in BrowserDriver
		// If tab initialization is async, the work can be done in _newTabDriver()
		this.__closed = false
	}

	get closed() { return this.__closed }

	_close(callback) {
		// => callback(err)
	}

	_open(url, options, callback) {
		// => callback(err, httpCode, httpStatus, url)
		// Note: err is a network error, not any >= 400 HTTP request
	}

	_injectFromDisk(url, callback) {
		// => callback(err)
	}

	_injectFromUrl(url, callback) {
		// => callback(err)
	}

	_waitUntilVisible(selectors, duration, condition, callback) {
		// => callback(err, selector)
	}

	_waitUntilPresent(selectors, duration, condition, callback) {
		// => callback(err, selector)
	}

	_waitWhileVisible(selectors, duration, condition, callback) {
		// => callback(err, selector)
	}

	_waitWhilePresent(selectors, duration, condition, callback) {
		// => callback(err, selector)
	}

}

export default TabDriver
