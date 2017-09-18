// Properties starting with _ are meant for the higher-level Nick browser
// Properties starting with __ are private to the driver
// Read-only properties should be configured as such

const TabDriver = require("./TabDriver")
//const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')
const _ = require("lodash")
const toBoolean = require("to-boolean")

class BrowserDriver {

	constructor(nick) {
		this._nick = nick
		this._options = nick.options
	}

	exit(code) {
		process.exit(code)
	}

	_initialize(callback) {
		//console.log("init")

		//const options = {
		//	port: 9222,
		//	logLevel: "verbose",
		//	//chromePath: 'google-chrome',
		//	chromeFlags: [
		//		`--window-size=${this._options.width},${this._options.height}`,
		//		"--disable-gpu",
		//		"--headless",
		//		"--disable-web-security",
		//		"--allow-insecure-localhost",
		//		"--allow-running-insecure-content",
		//		"--allow-file-access-from-files",
		//		"--hide-scrollbars",
		//	]
		//}
		//chromeLauncher.launch(options).then(() => {
		//	console.log("launch ok")
		//	callback(null)
		//}).catch((err) => {
		//	console.log("launch NOT ok")
		//	callback(err)
		//})

		const execFile = require("child_process").execFile
		const chromePath = process.env.CHROME_PATH || "google-chrome-unstable"
		const childOptions = [
			"--remote-debugging-port=9222",
			// headless flags
			"--disable-gpu",
			"--headless",
			"--hide-scrollbars",
			// allow ugly things because we want to scrape without being bothered
			"--disable-web-security",
			"--allow-insecure-localhost",
			"--allow-running-insecure-content",
			"--allow-file-access-from-files",
			// set window size
			`--window-size=${this._options.width},${this._options.height}`,
			// flags taken from chrome-launcher
			"--disable-translate", // built-in Google Translate stuff
			"--disable-extensions",
			"--disable-sync", // google account sync
			"--disable-background-networking",
			"--safebrowsing-disable-auto-update",
			"--metrics-recording-only",
			"--disable-default-apps",
			"--no-first-run",
		]

		// chrome doesnt support proxy auth directly, we'll intercept requests and respond to the auth challenges
		if (this._options.httpProxy) {
			const { URL } = require('url');
			const url = new URL(this._options.httpProxy)
			// extract auth settings from URL and save them in the options so that all tabs can use them
			this._options._proxyUsername = url.username
			this._options._proxyPassword = url.password
			childOptions.push(`--proxy-server=${url.host}`)
		}

		// some systems need this, sometimes
		if (toBoolean(process.env.NICKJS_NO_SANDBOX)) {
			childOptions.push(`--no-sandbox`)
		}

		const child = execFile(chromePath, childOptions)
		process.on("exit", () => {
			try {
				child.kill()
			} catch (e) {}
		})
		child.on("error", (err) => {
			callback(`could not start chrome: ${err}`) // it's alright, _initialize() is wrapped with once()
		})
		const cleanSocket = (socket) => {
			socket.removeAllListeners()
			socket.end()
			socket.destroy()
			socket.unref()
		}
		const net = require("net")
		const checkStart = Date.now()
		let nbChecks = 0
		const checkDebuggerPort = () => {
			setTimeout(() => {
				const socket = net.createConnection(9222)
				socket.once("error", (err) => {
					++nbChecks
					cleanSocket(socket)
					if ((Date.now() - checkStart) > (5 * 1000)) {
						callback(`could not connect to chrome debugger after ${nbChecks} tries: ${err}`)
					} else {
						checkDebuggerPort()
					}
				})
				socket.once("connect", () => {
					cleanSocket(socket)
					callback(null)
				})
			}, 200)
		}
		checkDebuggerPort()
	}

	_newTabDriver(uniqueTabId, callback) {
		const connectToTab = (cdpTarget) => {
			CDP({ target: cdpTarget }, (client) => {
				const tab = new TabDriver(uniqueTabId, this._options, client, cdpTarget.id)
				tab._init((err) => {
					if (err) {
						callback(err)
					} else {
						callback(null, tab)
					}
				})
			}).on('error', (err) => {
				callback(`cannot connect to chrome tab: ${err}`)
			})
		}
		CDP.List((err, tabs) => {
			if (err) {
				callback(`could not list chrome tabs: ${err}`)
			} else {
				if ((uniqueTabId === 1) && (tabs.length === 1) && (tabs[0].url === "about:blank")) {
					//console.log("connecting to initial tab")
					connectToTab(tabs[0])
				} else {
					CDP.New((err, tab) => {
						if (err) {
							callback(`cannot create new chrome tab: ${err}`)
						} else {
							//console.log("connecting to a new tab")
							connectToTab(tab)
						}
					})
				}
			}
		})
	}

	// We need an open connection to any Chrome tab to manipulate cookies. Instead of opening
	// a new socket/tab every time the user makes cookie requests, we use any currently open
	// tab he has (any tab will do).
	// This method also handles the error in case there are no open tabs.
	__getOneTabForCookieRequest(methodName, callback) {
		const tab = this._nick.tabs[Object.keys(this._nick.tabs)[0]]
		if (tab) {
			return tab
		} else {
			callback(`${methodName}: could not manipulate cookies because there are no open tabs, please open at least one tab`)
			return null
		}
	}

	_getAllCookies(callback) {
		const tab = this.__getOneTabForCookieRequest("getAllCookies", callback)
		if (tab) {
			tab.driver._getAllCookies(callback)
		}
	}

	_deleteAllCookies(callback) {
		const tab = this.__getOneTabForCookieRequest("deleteAllCookies", callback)
		if (tab) {
			tab.driver._deleteAllCookies(callback)
		}
	}

	_deleteCookie(name, domain, callback) {
		const tab = this.__getOneTabForCookieRequest("deleteCookie", callback)
		if (tab) {
			tab.driver._deleteCookie(name, domain, callback)
		}
	}

	_setCookie(cookie, callback) {
		const tab = this.__getOneTabForCookieRequest("setCookie", callback)
		if (tab) {
			tab.driver._setCookie(cookie, callback)
		}
	}

}

module.exports = BrowserDriver
