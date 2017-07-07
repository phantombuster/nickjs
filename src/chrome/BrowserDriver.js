// Properties starting with _ are meant for the higher-level Nick browser
// Properties starting with __ are private to the driver
// Read-only properties should be configured as such

const TabDriver = require("./TabDriver")
//const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')
const _ = require("lodash")

class BrowserDriver {

	constructor(options) {
		if (_.isObject(process) && _.isObject(process.versions) && (typeof process.versions.node === 'string')) {
			this._options = options
		} else {
			throw new Error("it seems we're not in a NodeJS environment - cannot start Chrome browser driver")
		}
	}

	exit(code) {
		process.exit(code)
	}

	_initialize(callback) {
		console.log("init")
		//const options = {
		//	port: 9222,
		//	chromePath: 'google-chrome',
		//	chromeFlags: [
		//		//`--window-size=${this._options.width},${this._options.height}`,
		//		"--disable-gpu",
		//		"--headless"
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
		const child = execFile("google-chrome-unstable", [
			`--window-size=${this._options.width},${this._options.height}`,
			"--disable-gpu",
			"--headless",
			"--disable-web-security",
			"--remote-debugging-port=9222"
		])
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
					console.log("connecting to initial tab")
					connectToTab(tabs[0])
				} else {
					CDP.New((err, tab) => {
						if (err) {
							callback(`cannot create new chrome tab: ${err}`)
						} else {
							console.log("connecting to a new tab")
							connectToTab(tab)
						}
					})
				}
			}
		})
	}

}

module.exports = BrowserDriver
