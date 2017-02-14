import * as _ from 'underscore'
import Promise from 'bluebird'

class Tab {

	constructor(nick, tabDriver) {
		this._nick = nick
		this._tabDriver = tabDriver
		this._actionInProgress = false
	}

	// Read-only members
	getNick() { return this._nick }
	getDriver() { return this._tabDriver } // shorter but less descriptive way to get the tab driver
	getTabDriver() { return this._tabDriver }
	actionInProgress() { return this._actionInProgress }
	isClosed() { return this._tabDriver.isClosed() }

	exit(code) {
		this._nick.exit(code)
	}

	_callToTabDriver(action, callback) {
		if (this._tabDriver.isClosed())
			throw new Error('this tab has finished its work (close() was called) - no other actions can be done with it')
		if (this._actionInProgress)
			throw new Error('cannot do this while another tab method is already running - each tab can execute only one action at a time')
		const done = (callback) => {
			return () => {
				this._actionInProgress = false
				callback.apply(arguments)
			}
		}
		this._actionInProgress = true
		if (callback)
			action(done(callback))
		else
			return Promise.fromCallback((callback) => action(done(callback)), { multiArgs: true })
	}

	open(url, options = {}, callback = null) {
		if (typeof url !== 'string')
			throw new Error('url parameter must be of type string')
		if (!_.isObject(options))
			throw new Error('options parameter must be of type object')
		if ((callback != null) && (typeof callback !== 'function'))
			throw new Error('callback parameter must be of type function')
		if (url.indexOf('://') < 0)
			url = `http://${url}`
		return this._callToTabDriver((callback) => this._tabDriver._open(url, options, callback), callback)
	}

	inject(url, callback = null) {
		if (typeof url !== 'string')
			throw new Error('url parameter must be of type string')
		if ((callback != null) && (typeof callback !== 'function'))
			throw new Error('callback parameter must be of type function')
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
