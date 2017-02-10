class Tab {

	constructor(nick, tabDriver) {
		this.nick = nick
		this.tabDriver = tabDriver
	}

	_callToTabDriver(action, callback) {
		if (this.ended)
			throw new Error('this Nick instance has finished its work (end() was called) - no other actions can be done with it')
		if (this.actionInProgress)
			throw new Error('cannot do this while another Nick method is already running - each Nick instance can execute only one action at a time')
		const done = (callback) => {
			return () => {
				this.actionInProgress = false
				callback.apply(arguments)
			}
		}
		this.actionInProgress = true
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
		if ((callback !== null) && (typeof callback !== 'function'))
			throw new Error('callback parameter must be of type function')
		if (url.indexOf('://') < 0)
			url = `http://${url}`
		return this._callToTabDriver((callback) => this.tabDriver.open(url, options, callback), callback)
	}

	inject(url, callback = null) {
		if (typeof url !== 'string')
			throw new Error('url parameter must be of type string')
		if ((callback !== null) && (typeof callback !== 'function'))
			throw new Error('callback parameter must be of type function')
		if ((url.trim().toLowerCase().indexOf('http://') === 0) || (url.trim().toLowerCase().indexOf('https://') === 0))
			return this._callToTabDriver((callback) => this.tabDriver.injectFromUrl(url, callback), callback)
		else
			return this._callToTabDriver((callback) => this.tabDriver.injectFromDisk(url, callback), callback)
	}

	waitUntilVisible(selectors, duration, condition, callback) { _callTabDriverWaitMethod('waitUntilVisible', selectors, duration, condition, callback) }
	waitWhileVisible(selectors, duration, condition, callback) { _callTabDriverWaitMethod('waitWhileVisible', selectors, duration, condition, callback) }
	waitUntilPresent(selectors, duration, condition, callback) { _callTabDriverWaitMethod('waitUntilPresent', selectors, duration, condition, callback) }
	waitWhilePresent(selectors, duration, condition, callback) { _callTabDriverWaitMethod('waitWhilePresent', selectors, duration, condition, callback) }
	_callTabDriverWaitMethod(method, selectors, duration = 10000, condition = 'and', callback = null) {
		// TODO checks
		return this._callToTabDriver((callback) => this.tabDriver[method](selectors, duration, condition, callback), callback)
	}

}

export default Tab
