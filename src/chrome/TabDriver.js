// Properties starting with _ are meant for the higher-level Nick tab
// Properties starting with __ are private to the driver

const _ = require('lodash')

class TabDriver {

	constructor(uniqueTabId, options, client) {
		this.__closed = false
		this.__uniqueTabId = uniqueTabId
		this.__client = client

		this.__client.Security.certificateError((e) => {
			Security.handleCertificateError({
				eventId: e.eventId,
				action: 'continue'
			});
		});

		//this.__client.Page.domContentEventFired((e) => {
		//	console.log("-- domContentEventFired: " + JSON.stringify(e, undefined, 2))
		//})
		//this.__client.Page.loadEventFired((e) => {
		//	console.log("-- loadEventFired: " + JSON.stringify(e, undefined, 2))
		//})
		//this.__client.Page.frameStartedLoading((e) => {
		//	console.log("-- frameStartedLoading: " + JSON.stringify(e, undefined, 2))
		//})
		//this.__client.Page.frameStoppedLoading((e) => {
		//	console.log("-- frameStoppedLoading: " + JSON.stringify(e, undefined, 2))
		//})
		//this.__client.Network.responseReceived((e) => {
		//	console.log(`-- responseReceived: ${e.response.status} (type: ${e.type}, frameId: ${e.frameId}, loaderId: ${e.loaderId}) ${e.response.url}`)
		//})
		//this.__client.Page.frameNavigated((e) => {
		//	console.log("-- frameNavigated: " + JSON.stringify(e, undefined, 2))
		//})
		this.__client.Runtime.consoleAPICalled((e) => {
			// TODO process all args
			console.log(`> Tab ${this.__uniqueTabId}: Console message: ${e.args[0].value}`)
		})

		if (options.printPageErrors) {
			// TODO check this is working
			this.__client.Runtime.exceptionThrown((e) => {
				console.log(`> Tab ${this.__uniqueTabId}: Page JavaScript error: ${e.exceptionDetails.text}`)
			})
		}
	}

	// allow the end user to do more specific things by using the driver directly
	get client() { return this.__client }

	get closed() { return this.__closed }

	_close(callback) {
		// => callback(err)
	}

	_open(url, options, callback) {
		// TODO handle options (POST etc)
		this.__client.Page.navigate({ url: url }, (err, res) => {
			if (err) {
				callback(err)
			} else {
				const frameId = res.frameId
				let status = null
				let statusText = null
				let newUrl = null
				const responseReceived = (e) => {
					if (e.frameId === frameId) {
						status = e.response.status
						statusText = e.response.statusText
					}
				}
				this.__client.on("Network.responseReceived", responseReceived)
				const frameNavigated = (e) => {
					if (e.frame.id === frameId) {
						newUrl = e.frame.url
						this.__client.removeListener("Network.responseReceived", responseReceived)
						this.__client.removeListener("Page.frameNavigated", frameNavigated)
						callback(null, status, statusText, newUrl)
					}
				}
				this.__client.on("Page.frameNavigated", frameNavigated)
			}
		})
	}

	// Guarantees:
	//  - selectors: array of strings containing at least one string
	//  - duration: positive number
	//  - operator: "and" or "or"
	// => callback(err, selector or null)
	_waitUntilVisible(selectors, duration, operator, callback) { this.__callWaitMethod('until', 'visible', selectors, duration, operator, callback) }
	_waitWhileVisible(selectors, duration, operator, callback) { this.__callWaitMethod('while', 'visible', selectors, duration, operator, callback) }
	_waitUntilPresent(selectors, duration, operator, callback) { this.__callWaitMethod('until', 'present', selectors, duration, operator, callback) }
	_waitWhilePresent(selectors, duration, operator, callback) { this.__callWaitMethod('while', 'present', selectors, duration, operator, callback) }
	__callWaitMethod(waitType, visType, selectors, duration, operator, callback) {
		const wait = (waitType, visType, selectors, duration, operator) => {
			if (visType === 'visible') {
				var selectorMatches = (selector) => {
					let ret = false
					for (const element of document.querySelectorAll(selector)) {
						const style = window.getComputedStyle(element)
						if ((style.visibility !== 'hidden') && (style.display !== 'none')) {
							const rect = element.getBoundingClientRect()
							if ((rect.width > 0) && (rect.height > 0)) {
								ret = true
								break
							}
						}
					}
					return waitType === 'while' ? !ret : ret
				}
			} else {
				var selectorMatches = (selector) => {
					const ret = document.querySelector(selector) != null
					return waitType === 'while' ? !ret : ret
				}
			}
			return new Promise((fulfill, reject) => {
				const start = Date.now()
				if (operator === "and") {
					const waitForAll = () => {
						let invalidSelector = null
						for (const sel of selectors) {
							if (!selectorMatches(sel)) {
								console.log("+++ Missing selector: " + sel, 1234)
								invalidSelector = sel
								break
							}
						}
						if (invalidSelector) {
							if ((start + duration) < Date.now()) {
								reject(`waited ${Date.now() - start}ms but element "${invalidSelector}" still ${waitType === 'while' ? '' : 'not '}${visType}`)
							} else {
								setTimeout((() => waitForAll()), 500)
							}
						} else {
							console.log("+++ All selectors found")
							fulfill()
						}
					}
					waitForAll()
				} else {
					const waitForOne = () => {
						let firstMatch = null
						for (const sel of selectors) {
							if (selectorMatches(sel)) {
								firstMatch = sel
								console.log("+++ Found one: " + sel)
								break
							}
						}
						if (firstMatch) {
							fulfill(firstMatch)
						} else {
							if ((start + duration) < Date.now()) {
								let elementsToString = selectors.slice()
								for (let e of elementsToString) {
									e = `"${e}"`
								}
								elementsToString = elementsToString.join(', ')
								reject(`waited ${Date.now() - start}ms but element${selectors.length > 0 ? 's' : ''} ${elementsToString} still ${waitType === 'while' ? '' : 'not '}${visType}`)
							} else {
								console.log("+++ Did not find any, retrying")
								setTimeout((() => waitForOne()), 500)
							}
						}
					}
					waitForOne()
				}
			})
		}
		const payload = {
			expression: `(${wait})("${waitType}", "${visType}", ${JSON.stringify(selectors)}, ${duration}, "${operator}")`,
			awaitPromise: true,
			returnByValue: true,
			silent: true
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			if (err) {
				callback(err)
			} else {
				//console.log(`evaluate result: ${JSON.stringify(res, undefined, 2)}`)
				callback(null, null)
			}
		})
	}

	_click(selector, options, callback) {
		// TODO use options
		const click = (selector) => {
			const target = document.querySelector(selector)
			if (target) {
				const evt = new MouseEvent("click", {
					bubbles: true,
					cancelable: true,
					view: window,
					detail: 1,
					//screenX: 1,
					//screenY: 1,
				})
			} else {
				throw 'cannot find selector'
			}
		}
		const payload = {
			expression: `(${click})(${JSON.stringify(selector)})`,
			returnByValue: true,
			silent: true
		}
		this.__client.Runtime.evaluate(payload, (err) => {
			callback(err)
		})
	}

	_evaluate(func, arg, callback) {
		const runEval = (func, arg) => {
			return new Promise((fulfill, reject) => {
				done = (err, res) => {
					if (err) {
						reject(err)
					} else {
						fulfill(res)
					}
				}
				func(arg, done)
			})
		}
		const payload = {
			expression: `(${runEval})((${func}), ${JSON.stringify(arg)})`,
			awaitPromise: true,
			returnByValue: true,
			silent: true
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			if (err) {
				callback(err)
			} else {
				console.log(`evaluate result: ${JSON.stringify(res, undefined, 2)}`)
				callback(null, res.result.value)
			}
		})
	}

	_getUrl(callback) {
		const payload = {
			expression: "window.location.href",
			returnByValue: true,
			silent: true
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			if (err) {
				callback(err)
			} else {
				callback(null, res.result.value)
			}
		})
	}

	_getContent(callback) {
		// => callback(err, content)
	}

	_fill(selector, params, options, callback) {
		// Guarantees:
		//  - selector: string
		// TODO describe params guarantees
		//  - options: plain object
		//		- submit: boolean
		// => callback(err)
	}

	_screenshot(filename, options, callback) {
		// Guarantees:
		//  - filename: string
		//  - options: plain object
		//		- format: "jpg", "png", "base64:jpg" or "base64:png"
		//		- quality: null or number between 1 and 100
		//		- clipRect: null or plain object
		//			- top: number
		//			- left: number
		//			- width: positive number
		//			- height: positive number
		//		- seletor: null or string
		// => callback(err, path)
	}

	_sendKeys(selector, keys, options, callback) {
		// Guarantees:
		//  - selector: string
		//  - keys: string or number TODO confirm this
		//  - options: plain object TODO describe more
		// => callback(err)
	}

	_injectFromDisk(url, callback) {
		// Guarantees:
		//  - url: string
		// => callback(err)
		// Control must return to the user when the injected script can immediately be used in an evaluate() call
	}

	_injectFromUrl(url, callback) {
		// Guarantees:
		//  - url: string beginning with http:// or https://
		// => callback(err)
		// Control must return to the user when the injected script can immediately be used in an evaluate() call
	}

}

module.exports = TabDriver
