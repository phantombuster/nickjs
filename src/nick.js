import * as _ from 'underscore'
import Casper from './casper'

class Nick {

	constructor(options = {}) {
		if (!_.isObject(options))
			throw new Error('options must be an object')

		const blacklist = []
		if (_.has(options, 'blacklist'))
			if (_.isArray(options.blacklist))
				for (const black of options.blacklist)
					if (black instanceof RegExp)
						blacklist.push(black)
					else if (typeof black === 'string')
						blacklist.push(black.toLowerCase())
					else
						throw new Error('blacklist option must be an array of strings or regexes')
			else
				throw new Error('blacklist option must be an array of strings or regexes')

		this._driver = new Casper(options)
	}

	getDriver() {
		return this._driver
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
		promise = new Promise((fulfill, reject) => {
			this._driver.open(url, options, fulfill, reject)
		})
		if (callback)
			promise.asCallback(callback, { spread: true })
		return promise
	}

	waitUntilVisible(selectors, duration = 10000, condition = 'and', callback = null) {
		promise = new Promise((fulfill, reject) => {
			this._driver.waitUntilVisible(selectors, duration, condition, fulfill, reject)
		})
		if (callback)
			promise.asCallback(callback, { spread: true })
		return promise
	}

}

export default Nick
