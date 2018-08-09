const Promise = require("bluebird")
const _ = require("lodash")

class Tab {

	constructor(nick, tabDriver) {
		this._nick = nick
		this._tabDriver = tabDriver
		this._actionInProgress = false
		// set default values for confirm and prompt JS dialogs
		this._tabDriver._onConfirm = (msg) => {
			return true
		}
		this._tabDriver._onPrompt = (msg) => {
			return ""
		}
	}

	// Read-only members
	get nick() { return this._nick }
	get driver() { return this._tabDriver } // shorter but less descriptive way to get the tab driver
	get tabDriver() { return this._tabDriver }
	get actionInProgress() { return this._actionInProgress }
	get closed() { return this._tabDriver.closed }
	get crashed() { return this._tabDriver.crashed }
	get id() { return this._tabDriver.id }

	set onConfirm(f) {
		if (typeof(f) !== "function") {
			throw new TypeError("onConfirm must receive a function")
		}
		this._tabDriver._onConfirm = f
	}

	set onPrompt(f) {
		if (typeof(f) !== "function") {
			throw new TypeError("onPrompt must receive a function")
		}
		this._tabDriver._onPrompt = f
	}

	_callToTabDriver(action, callback, multiArgs = false) {
		if (this._tabDriver.crashed) {
			throw new Error('this tab has crashed, no other actions can be done with it')
		}
		if (this._tabDriver.closed) {
			throw new Error('this tab has finished its work (close() was called), no other actions can be done with it')
		}
		if (this._actionInProgress) {
			throw new Error('cannot do this while another tab method is already running, each tab can execute only one action at a time')
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

	wait(duration, callback = null) {
		if ((typeof duration !== 'number') || (duration <= 0)) {
			throw new TypeError(`wait: duration parameter must be a positive number`)
		}
		return this._callToTabDriver((callback) => {
			setTimeout(() => {
				callback()
			}, duration)
		}, callback)
	}

	close(callback = null) {
		return this._callToTabDriver((callback) => {
			this._tabDriver._close((err) => {
				if (!err) {
					this.nick.unrefTabById(this.id)
				}
				callback(err)
			})
		}, callback)
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
		return this._callToTabDriver((callback) => { this._tabDriver._open(url.trim(), options, callback) }, callback, true) // use multiArgs
	}

	isVisible(selectors, operator, callback) { return this._isVisibleOrPresent("_waitUntilVisible", selectors, operator, callback) }
	isPresent(selectors, operator, callback) { return this._isVisibleOrPresent("_waitUntilPresent", selectors, operator, callback) }
	_isVisibleOrPresent(method, selectors, operator = null, callback = null) {
		if (typeof operator === 'function') {
			callback = operator
			operator = null
		}
		const f = (callback) => {
			this._callTabDriverWaitMethod(method, selectors, 1, operator, (err) => {
				callback(null, !Boolean(err))
			})
		}
		if (callback) {
			f(callback)
		} else {
			return Promise.fromCallback((callback) => { f(callback) })
		}
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
		selectors = selectors.map((s) => {
			s = s.trim()
			if (s.length <= 0) {
				throw new TypeError(`${method}: selectors parameter cannot contain an empty string`)
			}
			return s
		})
		if (typeof duration === 'function') {
			callback = duration
			duration = null
		} else if (operator === 'function') {
			callback = operator
			operator = null
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
		// TODO
		//this.waitUntilPresent(selector, () => {
			return this._callToTabDriver((callback) => { this._tabDriver._click(selector, options, callback) }, callback)
		//})
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
		// TODO
		//this.waitUntilPresent(selector, () => {
			return this._callToTabDriver((callback) => { this._tabDriver._fill(selector, params, options, callback) }, callback)
		//})
	}

	screenshot(filename, options = {}, callback = null) {
		if ((filename != null) && (typeof filename !== 'string')) {
			throw new TypeError('screenshot: filename parameter must be null or of type string')
		}
		// TODO check filename for png, jpg, jpeg, pdf, 'base64:png', 'base64:jpg'...
		// TODO more checks
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('screenshot: options parameter must be of type plain object')
		}
		// TODO check options: clipRect, selector, fullPage...
		return this._callToTabDriver((callback) => { this._tabDriver._screenshot(filename, options, callback) }, callback)
	}

	sendKeys(selector, keys, options = {}, callback = null) {
		if (typeof selector !== 'string') {
			throw new TypeError('sendKeys: selector parameter must be of type string')
		}
		if ((typeof keys !== 'string') && (typeof keys !== 'number')) {
			throw new TypeError('sendKeys: keys parameter must be of type string or number')
		}
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('sendKeys: options parameter must be of type plain object')
		}
		if (_.has(options, 'keepFocus')) {
			if (typeof options.keepFocus !== 'boolean') {
				throw new TypeError('sendKeys: keepFocus option must be of type boolean')
			}
		}
		if (_.has(options, 'reset')) {
			if (typeof options.reset !== 'boolean') {
				throw new TypeError('sendKeys: reset option must be of type boolean')
			}
		}
		if (_.has(options, 'modifiers')) {
			if (typeof options.modifiers !== 'string') {
				throw new TypeError('sendKeys: modifiers option must be of type string')
			}
		}
		// TODO
		//this.waitUntilPresent(selector, () => {
			return this._callToTabDriver((callback) => { this._tabDriver._sendKeys(selector, keys, options, callback) }, callback)
		//})
	}

	inject(url, callback = null) {
		if (typeof url !== 'string') {
			throw new TypeError('inject: url parameter must be of type string')
		}
		// a path beginning by file:// is considered a URL and not a local file
		if ((url.trim().toLowerCase().indexOf('http://') === 0) || (url.trim().toLowerCase().indexOf('https://') === 0) || (url.trim().toLowerCase().indexOf('file://') === 0)) {
			return this._callToTabDriver((callback) => { this._tabDriver._injectFromUrl(url, callback) }, callback)
		} else {
			return this._callToTabDriver((callback) => { this._tabDriver._injectFromDisk(url, callback) }, callback)
		}
	}

	scrollTo(x, y, callback) {
		return this.scroll(x, y, callback)
	}

	scroll(x, y, callback = null) {
		if (typeof(x) !== "number") {
			throw new TypeError("scrollTo: x parameter must be of type number")
		}
		if (typeof(y) !== "number") {
			throw new TypeError("scrollTo: y parameter must be of type number")
		}
		return this._callToTabDriver((callback) => { this._tabDriver._scroll(x, y, callback) }, callback)
	}

	scrollToBottom(callback = null) {
		return this._callToTabDriver((callback) => { this._tabDriver._scrollToBottom(callback) }, callback)
	}

	// These methods are not documented and should not be used:
	// cookies are global to the browser and have nothing to do with a tab.
	// But they work.
	getAllCookies(callback) { return this.nick.getAllCookies(callback) }
	deleteAllCookies(callback) { return this.nick.deleteAllCookies(callback) }
	deleteCookie(name, domain, callback) { return this.nick.deleteCookie(name, domain, callback) }
	setCookie(cookie, callback) { return this.nick.setCookie(cookie, callback) }

}

module.exports = Tab
