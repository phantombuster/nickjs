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
		const chromePath = process.env.CHROME_PATH || "google-chrome-beta"
		const childOptions = [
			"--remote-debugging-port=9222",
			// allow ugly things because we want to scrape without being bothered
			"--disable-web-security",
			"--allow-insecure-localhost",
			"--allow-running-insecure-content",
			"--allow-file-access-from-files",
			// set window size
			`--window-size=${this._options.width},${this._options.height}`,
			// flags taken from Puppeteer's defaultArgs
			"--disable-background-networking",
			"--disable-background-timer-throttling",
			"--disable-client-side-phishing-detection",
			"--disable-default-apps",
			"--disable-extensions",
			"--disable-hang-monitor",
			"--disable-popup-blocking",
			"--disable-prompt-on-repost",
			"--disable-sync", // google account sync
			"--disable-translate", // built-in Google Translate stuff
			"--metrics-recording-only", // record but don't report
			"--no-first-run",
			"--safebrowsing-disable-auto-update",
			"--password-store=basic",
			"--use-mock-keychain",
			//"--enable-crash-reporter",
			//"--enable-logging",
			//"--v=1",
		]

		if (this._options.headless) {
			childOptions.push("--disable-gpu")
			childOptions.push("--headless")
			childOptions.push("--hide-scrollbars")
			childOptions.push("--mute-audio")
		} else {
			childOptions.push("--enable-automation") // inform user that the browser is automatically controlled
		}

		if (this._options.additionalChildOptions) {
			childOptions.concat(this._options.additionalChildOptions);
		}

		// chrome doesnt support proxy auth directly, we'll intercept requests and respond to the auth challenges
		if (this._options.httpProxy) {
			const { URL } = require("url")
			const url = new URL(this._options.httpProxy)
			// extract auth settings from URL and save them in the options so that all tabs can use them
			this._options._proxyUsername = url.username
			this._options._proxyPassword = url.password
			childOptions.push(`--proxy-server=${url.host}`)
		}

		// some systems need this, sometimes
		if (toBoolean(process.env.NICKJS_NO_SANDBOX || false)) {
			childOptions.push("--no-sandbox")
			childOptions.push("--disable-setuid-sandbox")
		}

		const child = require("child_process").spawn(chromePath, childOptions)
		process.on("exit", () => {
			if (!child.killed) {
				try {
					child.kill()
				} catch (e) {}
			}
		})
		child.on("error", (err) => {
			callback(`could not start chrome: ${err}`) // it's alright, _initialize() is wrapped with once()
		})
		if (this._options.debug) {
			let that = this;
			child.stdout.on("data", (d) => {
				if (that._options.childStdout == 'stdout') {
					process.stdout.write("CHROME STDOUT: " + d.toString())
				}
				else {
					process.stderr.write("CHROME STDOUT: " + d.toString())
				}
			})
			child.stderr.on("data", (d) => {
				if (that._options.childStderr == 'stdout') {
					process.stdout.write("CHROME STDERR: " + d.toString())
				}
				else {
					process.stderr.write("CHROME STDERR: " + d.toString())
				}
			})
			const pidusage = require("pidusage")
			const logChromeMemory = () => {
				pidusage.stat(child.pid, (err, stat) => {
					if (!err && stat.cpu && stat.memory) {
						console.log(`> Chrome: CPU ${Math.round(stat.cpu)}%, memory ${Math.round(stat.memory / (1000 * 1000))}M`)
					}
				})
			}
			setInterval(logChromeMemory, 60 * 1000)
		} else {
			// still consume output when not in debug mode
			child.stdout.on("data", (d) => {})
			child.stderr.on("data", (d) => {})
		}
		child.on("exit", (code, signal) => {
			if (signal) {
				process.stdout.write(`\nFatal: Chrome subprocess killed by signal ${signal}\n\n`)
			} else {
				process.stdout.write(`\nFatal: Chrome subprocess exited with code ${code}\n\n`)
			}
			for (const tabId in this._nick.tabs) {
				this._nick.tabs[tabId].driver._chromeHasCrashed()
			}
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
					if ((Date.now() - checkStart) > (10 * 1000)) {
						callback(`could not connect to chrome debugger after ${nbChecks} tries (10s): ${err}`)
					} else {
						checkDebuggerPort()
					}
				})
				socket.once("connect", () => {
					if (this._options.debug) {
						console.log(`> It took ${Date.now() - checkStart}ms to start and connect to Chrome (${nbChecks + 1} tries)`)
					}
					cleanSocket(socket)
					callback(null)
				})
			}, Math.min(100 + nbChecks * 50, 500))
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
