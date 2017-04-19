// Properties starting with _ are meant for the higher-level Nick tab
// Properties starting with __ are private to the driver
// Read-only properties should be configured as such

// import tab-specific things...

class TabDriver {

	constructor(uniqueTabId, options) {
		// Should initialize the tab driver
		// This is called from _newTabDriver() in BrowserDriver
		// If tab initialization is async, the work can be done in _newTabDriver()
		this.__closed = false
		this.__uniqueTabId = uniqueTabId
	}

	get closed() { return this.__closed }

	_close(callback) {
		// => callback(err)
	}

	_open(url, options, callback) {
		// Guarantees:
		//  - url: string
		//  - options: plain object TODO describe more
		// => callback(err, httpCode, httpStatus, url)
		// Note: err is a network error, the presence of a HTTP code != 200 is not an error
		// Control must return to the user when TODO
	}

	// Guarantees:
	//  - selectors: array of strings containing at least one string
	//  - duration: positive number
	//  - operator: "and" or "or"
	// => callback(err, selector or null)
	_waitUntilVisible(selectors, duration, operator, callback) {}
	_waitUntilPresent(selectors, duration, operator, callback) {}
	_waitWhileVisible(selectors, duration, operator, callback) {}
	_waitWhilePresent(selectors, duration, operator, callback) {}

	_click(selector, options, callback) {
		// Guarantees:
		//  - selector: string
		//  - options: plain object TODO describe more
		// => callback(err)
	}

	_evaluate(func, arg, callback) {
		// Guarantees:
		//  - func: function
		//  - arg: null or plain object
		// => callback(err, res or null)
	}

	_getUrl(callback) {
		// => callback(err, url)
	}

	_getContent(callback) {
		// => callback(err, content)
	}

	_fill(selector, params, options, callback) {
		// Guarantees:
		//  - selector: string
		// TODO describe params guarantees
		//  - options: plain object
		//		- submit: boolean
		// => callback(err)
	}

	_screenshot(filename, options, callback) {
		// Guarantees:
		//  - filename: string
		//  - options: plain object
		//		- format: "jpg", "png", "base64:jpg" or "base64:png"
		//		- quality: null or number between 1 and 100
		//		- clipRect: null or plain object
		//			- top: number
		//			- left: number
		//			- width: positive number
		//			- height: positive number
		//		- seletor: null or string
		// => callback(err, path)
	}

	_sendKeys(selector, keys, options, callback) {
		// Guarantees:
		//  - selector: string
		//  - keys: string or number TODO confirm this
		//  - options: plain object TODO describe more
		// => callback(err)
	}

	_injectFromDisk(url, callback) {
		// Guarantees:
		//  - url: string
		// => callback(err)
		// Control must return to the user when the injected script can immediately be used in an evaluate() call
	}

	_injectFromUrl(url, callback) {
		// Guarantees:
		//  - url: string beginning with http:// or https://
		// => callback(err)
		// Control must return to the user when the injected script can immediately be used in an evaluate() call
	}

}

export default TabDriver
