const Promise = require("bluebird")
const _ = require("lodash")

class Tab {

	constructor(nick, tabDriver) {
		this._nick = nick
		this._tabDriver = tabDriver
		this._actionInProgress = false
	}

	// Read-only members
	get nick() { return this._nick }
	get driver() { return this._tabDriver } // shorter but less descriptive way to get the tab driver
	get tabDriver() { return this._tabDriver }
	get actionInProgress() { return this._actionInProgress }
	get closed() { return this._tabDriver.closed }

	_callToTabDriver(action, callback, multiArgs = false) {
		if (this._tabDriver.closed) {
			throw new Error('this tab has finished its work (close() was called) - no other actions can be done with it')
		}
		if (this._actionInProgress) {
			throw new Error('cannot do this while another tab method is already running - each tab can execute only one action at a time')
		}
		const getAugmentedCallback = (callback) => {
			let that = this
			return function() {
				that._actionInProgress = false
				callback.apply(null, arguments)
			}
		}
		this._actionInProgress = true
		if (callback != null) {
			if (typeof callback !== 'function') {
				throw new TypeError('callback parameter must be of type function')
			}
			action(getAugmentedCallback(callback))
		} else {
			return Promise.fromCallback((callback) => { action(getAugmentedCallback(callback)) }, { multiArgs: multiArgs })
		}
	}

	close(callback = null) {
		return this._callToTabDriver((callback) => { this._tabDriver._close(callback) }, callback)
	}

	open(url, options = {}, callback = null) {
		if (typeof url !== 'string') {
			throw new TypeError('open: url parameter must be of type string')
		}
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('open: options parameter must be of type plain object')
		}
		if (url.indexOf('://') < 0) {
			url = `http://${url}`
		}
		return this._callToTabDriver((callback) => { this._tabDriver._open(url, options, callback) }, callback, true) // use multiArgs
	}

	// short variant (made to look pretty when using `await untilVisible()` for example)
	untilVisible(selectors, duration, operator, callback) { return this._callTabDriverWaitMethod('_waitUntilVisible', selectors, duration, operator, callback) }
	whileVisible(selectors, duration, operator, callback) { return this._callTabDriverWaitMethod('_waitWhileVisible', selectors, duration, operator, callback) }
	untilPresent(selectors, duration, operator, callback) { return this._callTabDriverWaitMethod('_waitUntilPresent', selectors, duration, operator, callback) }
	whilePresent(selectors, duration, operator, callback) { return this._callTabDriverWaitMethod('_waitWhilePresent', selectors, duration, operator, callback) }
	// standard variant
	waitUntilVisible(selectors, duration, operator, callback) { return this._callTabDriverWaitMethod('_waitUntilVisible', selectors, duration, operator, callback) }
	waitWhileVisible(selectors, duration, operator, callback) { return this._callTabDriverWaitMethod('_waitWhileVisible', selectors, duration, operator, callback) }
	waitUntilPresent(selectors, duration, operator, callback) { return this._callTabDriverWaitMethod('_waitUntilPresent', selectors, duration, operator, callback) }
	waitWhilePresent(selectors, duration, operator, callback) { return this._callTabDriverWaitMethod('_waitWhilePresent', selectors, duration, operator, callback) }
	_callTabDriverWaitMethod(method, selectors, duration = null, operator = null, callback = null) {
		if (typeof selectors === 'string') {
			selectors = [selectors]
		} else if (Array.isArray(selectors)) {
			if (selectors.length > 0)
				// TODO trim, guarantee length > 0
				for (const sel of selectors) {
					if (typeof sel !== 'string') {
						throw new TypeError(`${method}: selectors parameter must be a string or an array of strings (css paths)`)
					}
				}
			else
				throw new TypeError(`${method}: selectors parameter must contain at least one string (css path)`)
		} else {
			throw new TypeError(`${method}: selectors parameter must be a string or an array of strings (css paths)`)
		}
		if (typeof duration === 'string') {
			// allow mix-up of duration and operator parameters
			const d = duration
			duration = operator
			operator = d
		}
		if (duration === null) {
			duration = 5000 // same as the default of CasperJS's waitFor()
		} else if ((typeof duration !== 'number') || (duration <= 0)) {
			throw new TypeError(`${method}: duration parameter must be a positive number`)
		}
		if (operator === null) {
			operator = 'and'
		} else if ((operator !== 'and') && (operator !== 'or')) {
			throw new TypeError(`${method}: operator parameter must be either "and" or "or"`)
		}
		return this._callToTabDriver((callback) => { this._tabDriver[method](selectors, duration, operator, callback) }, callback)
	}

	click(selector, options = {}, callback = null) {
		if (typeof selector !== 'string') {
			throw new TypeError('click: selector parameter must be of type string')
		}
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			// TODO add option for "real click", standardize, update skel
			throw new TypeError('click: options parameter must be of type plain object')
		}
		if (_.has(options, 'mouseEmulation')) {
			if (typeof options.submit !== 'boolean') {
				throw new TypeError('click: mouseEmulation option must be of type boolean')
			}
		} else {
			options.mouseEmulation = false
		}
		return this._callToTabDriver((callback) => { this._tabDriver._click(selector, options, callback) }, callback)
	}

	evaluate(func, arg = null, callback = null) {
		if (_.isPlainObject(func)) {
			// allow mix-up of func and arg parameters
			const f = func
			func = arg
			arg = f
		}
		if (typeof func !== 'function') {
			throw new TypeError('evaluate: func parameter must be of type function')
		}
		if (typeof arg === 'function') {
			callback = arg
			arg = null
		}
		if ((arg != null) && !_.isPlainObject(arg) && !_.isArray(arg)) {
			throw new TypeError('evaluate: arg parameter must be a plain object or an array')
		}
		return this._callToTabDriver((callback) => { this._tabDriver._evaluate(func, arg, callback) }, callback)
	}

	getUrl(callback = null) {
		return this._callToTabDriver((callback) => { this._tabDriver._getUrl(callback) }, callback)
	}

	getContent(callback = null) {
		return this._callToTabDriver((callback) => { this._tabDriver._getContent(callback) }, callback)
	}

	fill(selector, params, options = {}, callback = null) {
		if (typeof selector !== 'string') {
			throw new TypeError('fill: selector parameter must be of type string')
		}
		if (!_.isPlainObject(params)) {
			throw new TypeError('fill: params parameter must be of type plain object')
		}
		// TODO check params in more detail
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('fill: options parameter must be of type plain object')
		}
		if (_.has(options, 'submit')) {
			if (typeof options.submit !== 'boolean') {
				throw new TypeError('submit option must be of type boolean')
			}
		} else {
			options.submit = false
		}
		return this._callToTabDriver((callback) => { this._tabDriver._fill(selector, params, options, callback) }, callback)
	}

	screenshot(filename, options = {}, callback = null) {
		if ((filename != null) && (typeof filename !== 'string')) {
			throw new TypeError('filename parameter must be null or of type string')
		}
		// TODO check filename for png, jpg, jpeg, pdf
		// TODO more checks
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('options parameter must be of type plain object')
		}
		// TODO check options: clipRect, selector, ...
		return this._callToTabDriver((callback) => { this._tabDriver._screenshot(filename, options, callback) }, callback)
	}

	sendKeys(selector, keys, options = {}, callback = null) {
		if (typeof selector !== 'string') {
			throw new TypeError('selector parameter must be of type string')
		}
		if ((typeof keys !== 'string') && (typeof keys !== 'number')) {
			throw new TypeError('keys parameter must be of type string or number')
		}
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('options parameter must be of type plain object')
		}
		if (_.has(options, 'keepFocus')) {
			if (typeof options.keepFocus !== 'boolean') {
				throw new TypeError('keepFocus option must be of type boolean')
			}
		}
		if (_.has(options, 'reset')) {
			if (typeof options.reset !== 'boolean') {
				throw new TypeError('reset option must be of type boolean')
			}
		}
		if (_.has(options, 'modifiers')) {
			if (typeof options.reset !== 'string') {
				throw new TypeError('modifiers option must be of type string')
			}
		}
		return this._callToTabDriver((callback) => { this._tabDriver._sendKeys(selector, keys, options, callback) }, callback)
	}

	inject(url, callback = null) {
		if (typeof url !== 'string') {
			throw new TypeError('url parameter must be of type string')
		}
		// a path beginning by file:// is considered a URL and not a local file
		if ((url.trim().toLowerCase().indexOf('http://') === 0) || (url.trim().toLowerCase().indexOf('https://') === 0) || (url.trim().toLowerCase().indexOf('file://') === 0)) {
			return this._callToTabDriver((callback) => { this._tabDriver._injectFromUrl(url, callback) }, callback)
		} else {
			return this._callToTabDriver((callback) => { this._tabDriver._injectFromDisk(url, callback) }, callback)
		}
	}

	getAllCookies(callback = null) {
		return this._callToTabDriver((callback) => { this._tabDriver._getAllCookies(callback) }, callback)
	}

	deleteAllCookies(callback = null) {
		return this._callToTabDriver((callback) => { this._tabDriver._deleteAllCookies(callback) }, callback)
	}

	deleteCookie(name, url, callback = null) {
		if (typeof selector !== 'string') {
			throw new TypeError('name parameter must be of type string')
		}
		if (typeof url !== 'string') {
			throw new TypeError('url parameter must be of type string')
		}
		return this._callToTabDriver((callback) => { this._tabDriver._deleteCookie(name, url, callback) }, callback)
	}

	setCookie(cookie, callback = null) {
		if (!_.isPlainObject(cookie)) {
			throw new TypeError('cookie parameter must be of type plain object')
		}
		if (_.has(cookie, 'domain')) {
			if (typeof cookie.domain !== 'string') {
				throw new TypeError('cookie name option must be of type string')
			}
		}
		if (typeof cookie.name !== 'string') {
			throw new TypeError('cookie name option must be of type string')
		}
		if (typeof cookie.value !== 'string') {
			throw new TypeError('cookie value option must be of type string')
		}
		if (_.has(cookie, 'httponly')) {
			cookie.httpOnly = cookie.httponly // allow for "httpOnly" to be written as "httponly" (CasperJS compat.)
			// delete cookie.httponly
		}
		if (_.has(cookie, 'httpOnly')) {
			if (typeof cookie.httpOnly !== 'boolean') {
				throw new TypeError('cookie httpOnly option must be of type boolean')
			}
		}
		if (_.has(cookie, 'secure')) {
			if (typeof cookie.secure !== 'boolean') {
				throw new TypeError('cookie secure option must be of type boolean')
			}
		}
		return this._callToTabDriver((callback) => { this._tabDriver._deleteAllCookies(callback) }, callback)
	}

}

module.exports = Tab
