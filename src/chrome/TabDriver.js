// Properties starting with _ are meant for the higher-level Nick tab
// Properties starting with __ are private to the driver

class TabDriver {

	constructor(uniqueTabId, options, client) {
		this.__closed = false
		this.__uniqueTabId = uniqueTabId
		this.__client = client

		this.__client.Page.domContentEventFired((e) => {
			console.log("domContentEventFired: " + JSON.stringify(e, undefined, 2))
		})
		this.__client.Page.loadEventFired((e) => {
			console.log("loadEventFired: " + JSON.stringify(e, undefined, 2))
		})
		this.__client.Page.frameStartedLoading((e) => {
			console.log("frameStartedLoading: " + JSON.stringify(e, undefined, 2))
		})
		this.__client.Page.frameStoppedLoading((e) => {
			console.log("frameStoppedLoading: " + JSON.stringify(e, undefined, 2))
		})
		this.__client.Network.responseReceived((e) => {
			console.log("responseReceived: " + e.response.status + " " + e.response.url)
		})
		this.__client.Page.frameNavigated((e) => {
			console.log("frameNavigated: " + JSON.stringify(e, undefined, 2))
		})
	}

	// allow the end user to do more specific things by using the driver directly
	get client() { return this.__client }

	get closed() { return this.__closed }

	_close(callback) {
		// => callback(err)
	}

	_open(url, options, callback) {
		this.__client.Page.navigate({ url: url }, (err, res) => {
			if (err) {
				callback(err)
			} else {
				console.log(JSON.stringify(res, undefined, 2))
				callback(null)
			}
		})
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

module.exports = TabDriver
