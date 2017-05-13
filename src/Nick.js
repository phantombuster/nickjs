import Promise from 'bluebird'
import _ from 'lodash'
import Tab from './Tab'
import CasperBrowser from './casper/BrowserDriver'

Promise.onPossiblyUnhandledRejection(function(e, promise) {
	// TODO do we keep this? what's the best practice?
	console.log("> Unhandled Promise Rejection:")
	console.log(e)
	console.log(JSON.stringify(e, undefined, 2))
	throw e;
});

class Nick {

	constructor(options = {}) {
		// begin option checking
		if (!_.isPlainObject(options)) {
			throw new TypeError('options must be of type plain object')
		}

		// loadImages
		if (_.has(options, 'loadImages')) {
			if (typeof options.loadImages !== 'boolean') {
				throw new TypeError('loadImages option must be of type boolean')
			}
		} else {
			// Note: unlike other options, this one can be absent from the resulting options object
			// This is to prevent overriding the --load-images CasperJS CLI flag
			;
		}

		// userAgent
		if (_.has(options, 'userAgent')) {
			if (typeof options.userAgent !== 'string') {
				throw new TypeError('userAgent option must be of type string')
			}
		} else {
			options.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36'
		}

		// timeout
		if (_.has(options, 'timeout')) {
			if ((typeof options.timeout !== 'number') || (options.timeout < 0)) {
				throw new TypeError('timeout option must be a positive number')
			}
		} else {
			options.timeout = 10000
		}

		// width
		if (_.has(options, 'width')) {
			if ((typeof options.width !== 'number') || (options.width < 0)) {
				throw new TypeError('width option must be a positive number')
			}
		} else {
			options.width = 1280
		}

		// height
		if (_.has(options, 'height')) {
			if ((typeof options.height !== 'number') || (options.height < 0)) {
				throw new TypeError('height option must be a positive number')
			}
		} else {
			options.height = 800
		}

		// printNavigation
		if (_.has(options, 'printNavigation')) {
			if (typeof options.printNavigation !== 'boolean') {
				throw new TypeError('printNavigation option must be of type boolean')
			}
		} else {
			options.printNavigation = true
		}

		// printPageErrors
		if (_.has(options, 'printPageErrors')) {
			if (typeof options.printPageErrors !== 'boolean') {
				throw new TypeError('printPageErrors option must be of type boolean')
			}
		} else {
			options.printPageErrors = true
		}

		// printResourceErrors
		if (_.has(options, 'printResourceErrors')) {
			if (typeof options.printResourceErrors !== 'boolean') {
				throw new TypeError('printResourceErrors option must be of type boolean')
			}
		} else {
			options.printResourceErrors = true
		}

		// printAborts
		if (_.has(options, 'printAborts')) {
			if (typeof options.printAborts !== 'boolean') {
				throw new TypeError('printAborts option must be of type boolean')
			}
		} else {
			options.printAborts = true
		}

		// whitelist
		const whitelist = []
		if (_.has(options, 'whitelist')) {
			if (_.isArray(options.whitelist)) {
				for (const white of options.whitelist) {
					if (white instanceof RegExp) {
						whitelist.push(white)
					} else if (typeof white === 'string') {
						whitelist.push(white.toLowerCase())
					} else {
						throw new TypeError('whitelist option must be an array of strings or regexes')
					}
				}
			} else {
				throw new TypeError('whitelist option must be an array of strings or regexes')
			}
		}
		options.whitelist = whitelist

		// blacklist
		const blacklist = []
		if (_.has(options, 'blacklist')) {
			if (_.isArray(options.blacklist)) {
				for (const black of options.blacklist) {
					if (black instanceof RegExp) {
						blacklist.push(black)
					} else if (typeof black === 'string') {
						blacklist.push(black.toLowerCase())
					} else {
						throw new TypeError('blacklist option must be an array of strings or regexes')
					}
				}
			} else {
				throw new TypeError('blacklist option must be an array of strings or regexes')
			}
		}
		options.blacklist = blacklist

		// driver
		if (_.has(options, 'driver')) {
			if (typeof options.driver === 'string') {
				var driver = options.driver.toLowerCase()
			} else {
				throw new TypeError('driver option must be of type string')
			}
		} else {
			var driver = 'casper'
		}

		this._options = _.cloneDeep(options)

		// option checking is finished
		// initialize the chosen driver
		if (['casper', 'casperjs'].indexOf(driver) != -1) {
			this._browserDriver = new CasperBrowser(this._options)
		} else {
			throw new Error(`"${driver}" is an unknown driver`)
		}
		this._initialized = false
		this._initializing = false
		this._tabIdCounter = 0
	}

	// Read-only members
	get driver() { return this._browserDriver } // shorter but less descriptive way to get the tab driver
	get browserDriver() { return this._browserDriver }
	get options() { return this._options }

	exit(code = 0) {
		this._browserDriver.exit(code)
	}

	// Initializes the underlying browser driver
	// Guarantees only one call is made to the _initialize() method of the driver
	// even if multiple calls are made at the same time
	// Note: this method can be called by the end user for specific cases where initializing
	// the browser without opening tabs makes sense
	initialize(callback = null) {
		const promise = new Promise((fulfill, reject) => {
			if (this._initialized) {
				fulfill(null)
			} else {
				if (this._initializing) {
					checkForInitialization = () => {
						setTimeout(() => {
							if (!this._initializing) {
								if (this._initialized) {
									fulfill(null)
								} else {
									reject('browser initialization failed')
								}
							}
						}, 250)
					}
					checkForInitialization()
				} else {
					this._initializing = true
					this._browserDriver._initialize((err) => {
						this._initializing = false
						if (err) {
							reject(err)
						} else {
							this._initialized = true
							fulfill(null)
						}
					})
				}
			}
		})
		return promise.asCallback(callback)
	}

	newTab(callback = null) {
		return this.initialize().then(() => {
			return new Promise((fulfill, reject) => {
				++this._tabIdCounter
				this._browserDriver._newTabDriver(this._tabIdCounter, (err, tabDriver) => {
					if (err) {
						reject(err)
					} else {
						fulfill(new Tab(this, tabDriver))
					}
				})
			})
		}).asCallback(callback)
	}

}

export default Nick
