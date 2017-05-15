import _ from 'lodash'
import Promise from 'bluebird'

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
			throw new TypeError('url parameter must be of type string')
		}
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('options parameter must be of type plain object')
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
				for (const sel of selectors) {
					if (typeof sel !== 'string') {
						throw new TypeError('selectors parameter must be a string or an array of strings (css paths)')
					}
				}
			else
				throw new TypeError('selectors parameter must contain at least one string (css path)')
		} else {
			throw new TypeError('selectors parameter must be a string or an array of strings (css paths)')
		}
		if (typeof duration === 'string') {
			// allow mix-up of duration and operator parameters
			const d = duration
			duration = operator
			operator = d
		}
		if (duration === null) {
			duration = 10000
		} else if ((typeof duration !== 'number') || (duration <= 0)) {
			throw new TypeError('duration parameter must be a positive number')
		}
		if (operator === null) {
			operator = 'and'
		} else if ((operator !== 'and') && (operator !== 'or')) {
			throw new TypeError('operator parameter must be either "and" or "or"')
		}
		return this._callToTabDriver((callback) => { this._tabDriver[method](selectors, duration, operator, callback) }, callback)
	}

	click(selector, options = {}, callback = null) {
		if (typeof selector !== 'string') {
			throw new TypeError('selector parameter must be of type string')
		}
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			// TODO more checks
			throw new TypeError('options parameter must be of type plain object')
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
			throw new TypeError('func parameter must be of type function')
		}
		if (typeof arg === 'function') {
			callback = arg
			arg = null
		}
		if ((arg != null) && !_.isPlainObject(arg) && !_.isArray(arg)) {
			throw new TypeError('arg parameter must be a plain object or an array')
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
			throw new TypeError('selector parameter must be of type string')
		}
		// TODO check params
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('options parameter must be of type plain object')
		}
		if (_.has(options, 'submit')) {
			if (typeof options.submit !== 'boolean') {
				throw new TypeError('submit option must be a boolean')
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
		// TODO checks
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('options parameter must be of type plain object')
		}
		// TODO check options
		return this._callToTabDriver((callback) => { this._tabDriver._screenshot(filename, options, callback) }, callback)
	}

	sendKeys(selector, keys, options = {}, callback = null) {
		if (typeof selector !== 'string') {
			throw new TypeError('selector parameter must be of type string')
		}
		if ((typeof keys !== 'string') && (typeof keys !== 'number')) {
			// TODO confirm this check (what's a special key? multiple special keys?)
			throw new TypeError('keys parameter must be of type string or number')
		}
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options)) {
			throw new TypeError('options parameter must be of type plain object')
		}
		// TODO check options
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

}

export default Tab
