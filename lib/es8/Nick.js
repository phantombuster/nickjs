const Promise = require("bluebird")
const _ = require("lodash")
const once = require("once")
const toBoolean = require("to-boolean")
const Tab = require("./Tab")

Promise.onPossiblyUnhandledRejection(function(e, promise) {
	// TODO do we keep this? what's the best practice?
	console.log("> Unhandled Promise Rejection:")
	console.log(e)
	console.log(JSON.stringify(e, undefined, 2))
	throw e;
});

class Nick {

	constructor(options = {}) {
		// verify the environment we're in and select the corresponding browser driver
		if ((typeof process !== "undefined") && _.isObject(process) && _.isObject(process.versions) && (typeof process.versions.node === 'string')) {
			var BrowserDriver = require('./chrome/BrowserDriver')
			var environment = process.env
		} else if ((typeof phantom !== "undefined") && _.isObject(phantom) && (typeof(phantom.casperPath) === 'string')) {
			var BrowserDriver = require('./casper/BrowserDriver')
			var environment = require("system").env
		} else {
			if (_.isObject(phantom)) {
				throw new Error("Cannot initialize NickJS because it seems you're running PhantomJS without CasperJS. NickJS scripts can be run by either NodeJS or CasperJS, but not PhantomJS alone.")
			} else {
				throw new Error("Cannot initialize NickJS: could not determine the environment. Is it NodeJS or CasperJS? Where are we? NickJS scripts can be run by either NodeJS or CasperJS.")
			}
		}

		// begin option checking
		if (!_.isPlainObject(options)) {
			throw new TypeError('options must be of type plain object')
		}

		// debug
		if (_.has(options, 'debug')) {
			if (typeof options.debug !== 'boolean') {
				throw new TypeError('debug option must be of type boolean')
			}
		} else {
			options.debug = false
		}

		// headless
		if (_.has(options, 'headless')) {
			if (typeof options.headless !== 'boolean') {
				throw new TypeError('headless option must be of type boolean')
			}
		} else {
			options.headless = true
		}

		// loadImages
		if (_.has(options, 'loadImages')) {
			if (typeof options.loadImages !== 'boolean') {
				throw new TypeError('loadImages option must be of type boolean')
			}
		} else if (environment.NICKJS_LOAD_IMAGES) {
			options.loadImages = toBoolean(environment.NICKJS_LOAD_IMAGES || false)
		} else {
			// Unlike most other options, this one can be absent from the resulting options object
			// This is to prevent overriding the --load-images CasperJS CLI flag
		}

		// httpProxy
		if (_.has(options, 'httpProxy')) {
			if (typeof options.httpProxy !== 'string') {
				throw new TypeError('httpProxy option must be of type string')
			}
		} else {
			options.httpProxy = environment.NICKJS_PROXY || environment.HTTP_PROXY || environment.http_proxy
		}
		// make sure we have a non-empty proxy string using the http protocol
		if (options.httpProxy) {
			let urlCheck = options.httpProxy.trim().toLowerCase()
			if (urlCheck.length) {
				if ((urlCheck.indexOf("http://") < 0) && (urlCheck.indexOf("https://") < 0)) {
					options.httpProxy = `http://${options.httpProxy}`
				}
			} else {
				options.httpProxy = null
			}
		}

		// userAgent
		if (_.has(options, 'userAgent')) {
			if (typeof options.userAgent !== 'string') {
				throw new TypeError('userAgent option must be of type string')
			}
		} else {
			options.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.146 Safari/537.36'
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
		if (_.has(options, 'childStderr')) {
			if (typeof options.childStderr !== 'string' || (_.isString(options.childStderr) || !_.includes(['stdout', 'stderr'], options.childStderr))) {
				throw new TypeError('childStderr option must be of type string and have one of the value: stderr or stdout')
			}
		} else {
			options.childStderr = 'stdout'
		}

		if (_.has(options, 'childStdout')) {
			if (typeof options.childStdout !== 'string' || (_.isString(options.childStdout) || !_.includes(['stdout', 'stderr'], options.childStdout))) {
				throw new TypeError('childStdout option must be of type string and have one of the value: stderr or stdout')
			}
		} else {
			options.childStdout = 'stdout'
		}

		// additionalChildOptions
		if (_.has(options, 'additionalChildOptions')) {
			if ((typeof process !== "undefined") && _.isObject(process) && _.isObject(process.versions) && (typeof process.versions.node === 'string')) {
				if (!_.isArray(options.additionalChildOptions) || (_.isArray(options.additionalChildOptions) && !_.every(options.additionalChildOptions, _.isString))) {
					throw new TypeError('additionalChildOptions option must be of type array with string elements')
				}
			} else {
				if (!_.isArray(options.additionalChildOptions) || (_.isArray(options.additionalChildOptions) && !_.every(options.additionalChildOptions, _.isObject))) {
					throw new TypeError('additionalChildOptions option must be of type array with {} elements')
				}
			}
		} else {
			options.additionalChildOptions = []
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

		this._options = _.cloneDeep(options)

		this._initialized = false
		this._initializing = false
		this._tabIdCounter = 0

		this._tabs = {}

		// option checking is finished
		// initialize the chosen driver
		this._browserDriver = new BrowserDriver(this)
	}

	// Read-only members
	get driver() { return this._browserDriver } // shorter but less descriptive way to get the browser driver
	get browserDriver() { return this._browserDriver }
	get options() { return this._options }
	get tabs() { return this._tabs }

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
					const checkForInitialization = () => {
						setTimeout(() => {
							if (this._initializing) {
								checkForInitialization()
							} else {
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
					this._browserDriver._initialize(once((err) => {
						this._initializing = false
						if (err) {
							reject(err)
						} else {
							this._initialized = true
							fulfill(null)
						}
					}))
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
						const t = new Tab(this, tabDriver)
						this._tabs["" + this._tabIdCounter] = t
						fulfill(t)
					}
				})
			})
		}).asCallback(callback)
	}

	unrefTabById(id) {
		delete this._tabs["" + id]
	}

	getAllCookies(callback = null) {
		return this.initialize().then(() => Promise.fromCallback((callback) => this._browserDriver._getAllCookies(callback))).asCallback(callback)
	}

	deleteAllCookies(callback = null) {
		return this.initialize().then(() => Promise.fromCallback((callback) => this._browserDriver._deleteAllCookies(callback))).asCallback(callback)
	}

	deleteCookie(name, domain, callback = null) {
		if (typeof name !== 'string') {
			throw new TypeError('deleteCookie: name parameter must be of type string')
		}
		if (typeof domain !== 'string') {
			throw new TypeError('deleteCookie: domain parameter must be of type string')
		}
		return this.initialize().then(() => Promise.fromCallback((callback) => this._browserDriver._deleteCookie(name, domain, callback))).asCallback(callback)
	}

	setCookie(cookie, callback = null) {
		if (!_.isPlainObject(cookie)) {
			throw new TypeError('setCookie: cookie parameter must be of type plain object')
		}
		if (_.has(cookie, 'domain')) {
			if (typeof cookie.domain !== 'string') {
				throw new TypeError('setCookie: cookie name option must be of type string')
			}
		}
		if (typeof cookie.name !== 'string') {
			throw new TypeError('setCookie: cookie name option must be of type string')
		}
		if (typeof cookie.value !== 'string') {
			throw new TypeError('setCookie: cookie value option must be of type string')
		}
		if (_.has(cookie, 'httponly')) {
			cookie.httpOnly = cookie.httponly // allow for "httpOnly" to be written as "httponly" (CasperJS compat.)
		}
		if (_.has(cookie, 'httpOnly')) {
			if (typeof cookie.httpOnly !== 'boolean') {
				throw new TypeError('setCookie: cookie httpOnly option must be of type boolean')
			}
		}
		if (_.has(cookie, 'secure')) {
			if (typeof cookie.secure !== 'boolean') {
				throw new TypeError('setCookie: cookie secure option must be of type boolean')
			}
		}
		return this.initialize().then(() => Promise.fromCallback((callback) => this._browserDriver._setCookie(cookie, callback))).asCallback(callback)
	}

}

module.exports = Nick
