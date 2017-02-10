import { create } from 'casper'
import TabDriver from './TabDriver'

class BrowserDriver {

	construtor(nick, options) {
		this._nick = nick
		this._options = options
	}

	_initialize(callback) {
		// We're already in a PhantomJS environment
		// The browser is already initialized
		// The options will be applied for every new tab
		callback(null)
	}

	_newTabDriver(callback) {
		callback(new TabDriver(this._options))
	}

}

export default BrowserDriver
