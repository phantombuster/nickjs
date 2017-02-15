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

	exit(code = 0) {
		this._nick.exit(code)
	}

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

	inject(url, callback = null) {
		if (typeof url !== 'string')
			throw new Error('url parameter must be of type string')
		if ((url.trim().toLowerCase().indexOf('http://') === 0) || (url.trim().toLowerCase().indexOf('https://') === 0))
			return this._callToTabDriver((callback) => this._tabDriver._injectFromUrl(url, callback), callback)
		else
			return this._callToTabDriver((callback) => this._tabDriver._injectFromDisk(url, callback), callback)
	}

	waitUntilVisible(selectors, duration, condition, callback) { _callTabDriverWaitMethod('_waitUntilVisible', selectors, duration, condition, callback) }
	waitWhileVisible(selectors, duration, condition, callback) { _callTabDriverWaitMethod('_waitWhileVisible', selectors, duration, condition, callback) }
	waitUntilPresent(selectors, duration, condition, callback) { _callTabDriverWaitMethod('_waitUntilPresent', selectors, duration, condition, callback) }
	waitWhilePresent(selectors, duration, condition, callback) { _callTabDriverWaitMethod('_waitWhilePresent', selectors, duration, condition, callback) }
	_callTabDriverWaitMethod(method, selectors, duration = 10000, condition = 'and', callback = null) {
		// TODO checks
		return this._callToTabDriver((callback) => this._tabDriver[method](selectors, duration, condition, callback), callback)
	}

}

export default Tab
