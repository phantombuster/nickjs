import * as _ from 'underscore'
import TabDriver from './TabDriver'

class BrowserDriver {

	constructor(options) {
		if (_.isObject(phantom) && (typeof(phantom.casperPath) === 'string'))
			this._options = options
		else
			throw new Error("it seems we're not in a PhantomJS+CasperJS environment - cannot start CasperJS browser driver")
	}

	exit(code) {
		phantom.exit(code)
	}

	_initialize(callback) {
		// We're already in a PhantomJS environment
		// The browser is already initialized
		// The options will be applied for every new tab
		callback(null)
	}

	_newTabDriver(callback) {
		callback(null, new TabDriver(this._options))
	}

}

export default BrowserDriver
