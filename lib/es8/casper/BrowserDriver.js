const _ = require("lodash")
const TabDriver = require("./TabDriver")

class BrowserDriver {

	constructor(nick) {
		this._nick = nick
		this._options = nick.options
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

	_newTabDriver(uniqueTabId, callback) {
		callback(null, new TabDriver(uniqueTabId, this._options))
	}

	_getAllCookies(callback) {
		callback(null, phantom.cookies)
	}

	_deleteAllCookies(callback) {
		try {
			// try-catch just in case...
			phantom.clearCookies()
		} catch (e) {
			callback(`deleteAllCookies: failed to delete all cookies: ${e.toString()}`)
			return
		}
		callback(null)
	}

	_deleteCookie(name, domain, callback) {
		// phantomJS completely ignores the domain parameter
		// and deletes cookies only based on their names
		try {
			// try-catch just in case...
			var ret = phantom.deleteCookie(name)
		} catch(e) {
			callback(`deleteCookie: failed to delete cookie "${cookie.name}": ${e.toString()}`)
			return
		}
		if (ret) {
			callback(null)
		} else {
			callback(`deleteCookie: failed to delete cookie "${cookie.name}"`)
		}
	}

	_setCookie(cookie, callback) {
		// phantomJS expects cookie domains to start with a dot
		let domain = cookie.domain
		if ((domain.trim().toLowerCase().indexOf("http://") === 0) || (domain.trim().toLowerCase().indexOf("https://") === 0)) {
			callback(`setCookie: cannot set cookie "${cookie.name}": specify a domain instead of an URL (${domain})`)
			return
		}
		if (domain[0] !== ".") {
			domain = `.${domain}`
		}
		const c = {
			name: cookie.name,
			value: cookie.value,
			domain: domain,
			path: "/",
			expires: (Date.now() + (365 * 24 * 60 * 60 * 1000))
		}
		if (_.has(cookie, "secure")) {
			c.secure = cookie.secure
		}
		if (_.has(cookie, "httpOnly")) {
			c.httponly = cookie.httpOnly // yes, lower-case o
		}
		try {
			// try-catch just in case...
			var ret = phantom.addCookie(c)
		} catch (e) {
			callback(`setCookie: failed to add cookie "${cookie.name}": ${e.toString()}`)
			return
		}
		if (ret) {
			callback(null)
		} else {
			callback(`setCookie: failed to add cookie "${cookie.name}"`)
		}
	}


}

module.exports = BrowserDriver
