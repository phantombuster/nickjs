import * as _ from 'underscore'
import Tab from './Tab'
import { Browser as CasperBrowser } from './casper/BrowserDriver'

class Nick {

	constructor(options = {}) {
		if (!_.isObject(options))
			throw new TypeError('options must be an object')

		const blacklist = []
		if (_.has(options, 'blacklist'))
			if (_.isArray(options.blacklist))
				for (const black of options.blacklist)
					if (black instanceof RegExp)
						blacklist.push(black)
					else if (typeof black === 'string')
						blacklist.push(black.toLowerCase())
					else
						throw new TypeError('blacklist option must be an array of strings or regexes')
			else
				throw new TypeError('blacklist option must be an array of strings or regexes')
		options.blacklist = blacklist

		if (_.has(options, 'driver'))
			if (typeof options.driver === 'string')
				driver = options.driver.toLowerCase()
			else
				throw new TypeError('driver option must be a string')
		else
			driver = 'casper'

		if (['casper', 'casperjs'].indexOf(driver) != -1)
			this.browserDriver = new CasperBrowser(this, options)
		else
			throw new Error(`"${driver}" is an unknown driver`)

		this.options = options

		this._initialized = false
		this._initializing = false
	}

	// Initializes the underlying browser driver
	// Guarantees only one call is made to the _initialize() method of the driver
	// even if multiple calls are made at the same time
	// Note: this method could be called by the end user for specific cases where initializing
	// the browser without opening tabs makes sense
	initialize(callback = null) {
		promise = new Promise((fulfill, reject) => {
			if (this._initialized)
				fulfill(null)
			else
				if (this._initializing) {
					checkForInitialization = () => {
						setTimeout(() => {
							if (!this._initializing)
								if (this._initialized)
									fulfill(null)
								else
									reject('browser initialization failed')
						}, 250)
					}
					checkForInitialization()
				} else {
					this._initializing = true
					this.browserDriver._initialize((err) => {
						this._initializing = false
						if (err)
							reject(err)
						else
							this._initialized = true
							fulfill(null)
					})
				}
		})
		return promise.asCallback(callback)
	}

	newTab(callback = null) {
		return this.initialize().then(() => {
			return new Promise((fulfill, reject) => {
				this.browserDriver._newTabDriver((err, tabDriver) => {
					if (err)
						reject(err)
					else
						fulfill(new Tab(tabDriver))
				})
			})
		}).asCallback(callback)
	}

}

export default Nick
