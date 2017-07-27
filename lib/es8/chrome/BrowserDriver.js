// Properties starting with _ are meant for the higher-level Nick browser
// Properties starting with __ are private to the driver
// Read-only properties should be configured as such

const TabDriver = require("./TabDriver")
//const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')
const _ = require("lodash")

class BrowserDriver {

	constructor(options) {
		this._options = options
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
		const chromePath = process.env.CHROME_PATH || "google-chrome"
		const child = execFile(chromePath, [
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
		])
		// TODO 1. check error state of fork
		// TODO 2. loop on net.createConnection to know when the debugger is ready
		process.on('exit', () => {
			console.log("Killing Chrome child process")
			child.kill()
		})
		setTimeout(() => callback(null), 1000)
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
				if ((tabs.length === 1) && (tabs[0].url === "about:blank")) {
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

}

module.exports = BrowserDriver
