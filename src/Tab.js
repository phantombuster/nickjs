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

	_callToTabDriver(action, callback) {
		if (this._tabDriver.closed)
			throw new Error('this tab has finished its work (close() was called) - no other actions can be done with it')
		if (this._actionInProgress)
			throw new Error('cannot do this while another tab method is already running - each tab can execute only one action at a time')
		const getAugmentedCallback = (callback) => {
			return () => {
				console.log(JSON.stringify(Array.prototype.slice.call(arguments), undefined, 2));
				this._actionInProgress = false
				callback.apply(null, arguments)
			}
		}
		this._actionInProgress = true
		if (callback != null) {
			if (typeof callback !== 'function')
				throw new TypeError('callback parameter must be of type function')
			console.log("callback was provided")
			action(callback)
			//action(getAugmentedCallback(callback))
		} else
			return Promise.fromCallback((callback) => action(getAugmentedCallback(callback)), { multiArgs: true })
	}

	close(callback = null) {
		return this._callToTabDriver((callback) => this._tabDriver._close(callback), callback)
	}

	open(url, options = {}, callback = null) {
		if (typeof url !== 'string')
			throw new Error('url parameter must be of type string')
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options))
			throw new Error('options parameter must be of type plain object')
		if (url.indexOf('://') < 0)
			url = `http://${url}`
		return this._callToTabDriver((callback) => this._tabDriver._open(url, options, callback), callback)
	}

	waitUntilVisible(selectors, duration, operator, callback) { _callTabDriverWaitMethod('_waitUntilVisible', selectors, duration, operator, callback) }
	waitWhileVisible(selectors, duration, operator, callback) { _callTabDriverWaitMethod('_waitWhileVisible', selectors, duration, operator, callback) }
	waitUntilPresent(selectors, duration, operator, callback) { _callTabDriverWaitMethod('_waitUntilPresent', selectors, duration, operator, callback) }
	waitWhilePresent(selectors, duration, operator, callback) { _callTabDriverWaitMethod('_waitWhilePresent', selectors, duration, operator, callback) }
	_callTabDriverWaitMethod(method, selectors, duration = 10000, operator = 'and', callback = null) {
		// TODO checks
		return this._callToTabDriver((callback) => this._tabDriver[method](selectors, duration, operator, callback), callback)
	}

	click(selector, options = {}, callback = null) {
		if (typeof selector !== 'string')
			throw new Error('selector parameter must be of type string')
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options))
			throw new Error('options parameter must be of type plain object')
		return this._callToTabDriver((callback) => this._tabDriver._click(selector, options, callback), callback)
	}

	evaluate(func, param = {}, callback = null) {
	}

	getUrl(callback = null) {
		return this._callToTabDriver((callback) => this._tabDriver._getUrl(callback), callback)
	}

	getContent(callback = null) {
		return this._callToTabDriver((callback) => this._tabDriver._getContent(callback), callback)
	}

	fill(selector, params, options = {}, callback = null) {
		if (typeof selector !== 'string')
			throw new Error('selector parameter must be of type string')
		// TODO check params
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options))
			throw new Error('options parameter must be of type plain object')
		// TODO check options
		return this._callToTabDriver((callback) => this._tabDriver._fill(selector, params, submit, callback), callback)
	}

	screenshot(filename, options = {}, callback = null) {
		if (typeof filename !== 'string')
			throw new Error('filename parameter must be of type string')
		// TODO checks
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options))
			throw new Error('options parameter must be of type plain object')
		// TODO check options
		return this._callToTabDriver((callback) => this._tabDriver._screenshot(filename, options, callback), callback)
	}

	sendKeys(selector, keys, options = {}, callback = null) {
		if (typeof selector !== 'string')
			throw new Error('selector parameter must be of type string')
		if ((typeof keys !== 'string') && (typeof keys !== 'number'))
			// TODO confirm this check (what's a special key? multiple special keys?)
			throw new Error('keys parameter must be of type string or number')
		if (typeof options === 'function') {
			callback = options
			options = {}
		}
		if (!_.isPlainObject(options))
			throw new Error('options parameter must be of type plain object')
		// TODO check options
		return this._callToTabDriver((callback) => this._tabDriver._sendKeys(selector, keys, options, callback), callback)
	}

	inject(url, callback = null) {
		if (typeof url !== 'string')
			throw new Error('url parameter must be of type string')
		if ((url.trim().toLowerCase().indexOf('http://') === 0) || (url.trim().toLowerCase().indexOf('https://') === 0))
			return this._callToTabDriver((callback) => this._tabDriver._injectFromUrl(url, callback), callback)
		else
			return this._callToTabDriver((callback) => this._tabDriver._injectFromDisk(url, callback), callback)
	}

}

export default Tab
