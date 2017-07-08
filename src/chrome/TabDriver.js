// Properties starting with _ are meant for the higher-level Nick tab
// Properties starting with __ are private to the driver

const _ = require('lodash')

class TabDriver {

	constructor(uniqueTabId, options, client, cdpTargetId) {
		this.__closed = false
		this.__uniqueTabId = uniqueTabId
		this.__options = options
		this.__client = client
		this.__cdpTargetId = cdpTargetId
	}

	_init(callback) {
		Promise.all([
			this.__client.Page.enable(),
			this.__client.Network.enable(),
			this.__client.Runtime.enable(),
			this.__client.Security.enable(),
		]).then(() => {
			return this.__client.Security.setOverrideCertificateErrors({override: true})
		}).then(() => {
			if ((this.__options.whitelist.length > 0) || (this.__options.blacklist.length > 0)) {
				return this.__client.Network.enableRequestInterception({ enabled: true })
			}
		}).then(() => {
			console.log("Setting user agent: " + this.__options.userAgent)
			return this.__client.Network.setUserAgentOverride({ userAgent: this.__options.userAgent })
		}).then(() => {

			// accept all certificates
			this.__client.Security.certificateError((e) => {
				Security.handleCertificateError({
					eventId: e.eventId,
					action: 'continue'
				});
			});

			// request blocking
			if ((this.__options.whitelist.length > 0) || (this.__options.blacklist.length > 0)) {
				const continueRequest = (e, error, reason) => {
					if (error) {
						console.log("ABORTING request to " + e.request.url)
					} else {
						console.log("ALLOWING request to " + e.request.url)
					}
					if (reason && this.__options.printAborts) {
						console.log(`> Tab ${this.__uniqueTabId}: Aborted (${reason}): ${e.request.url}`)
					}
					const payload = {
						interceptionId: e.interceptionId
					}
					if (error) {
						payload.errorReason = error
					}
					this.__client.Network.continueInterceptedRequest(payload, (err, res) => {
						// We're ignoring errors here. Nothing can be done about it.
					})
				}
				this.__client.Network.requestIntercepted((e) => {
					if (this.__options.whitelist.length > 0) {
						let found = false
						for (const white of this.__options.whitelist) {
							if (typeof white === "string") {
								const url = e.request.url.toLowerCase()
								if ((url.indexOf(white) === 0) || (url.indexOf(`https://${url}`)) === 0 || (url.indexOf(`http://${url}`) === 0)) {
									found = true
									break
								}
							} else if (white.test(e.request.url)) {
								found = true
								break
							}
						}
						if (!found) {
							return continueRequest(e, "Aborted", "not found in whitelist")
						}
					}
					for (const black of this.__options.blacklist) {
						if (typeof black === 'string') {
							const url = e.request.url.toLowerCase()
							if ((url.indexOf(black) === 0) || (url.indexOf(`https://${url}`)) === 0 || (url.indexOf(`http://${url}`) === 0)) {
								return continueRequest(e, "Aborted", `blacklisted by "${black}"`)
							}
						} else if (black.test(e.request.url)) {
							return continueRequest(e, "Aborted", `blacklisted by ${black}`)
						}
					}
					continueRequest(e)
				})
			}

			this.__client.Page.domContentEventFired((e) => {
				console.log("-- domContentEventFired: " + JSON.stringify(e, undefined, 2))
			})
			this.__client.Page.loadEventFired((e) => {
				console.log("-- loadEventFired: " + JSON.stringify(e, undefined, 2))
			})
			this.__client.Page.frameStartedLoading((e) => {
				console.log("-- frameStartedLoading: " + JSON.stringify(e, undefined, 2))
			})
			this.__client.Page.frameStoppedLoading((e) => {
				console.log("-- frameStoppedLoading: " + JSON.stringify(e, undefined, 2))
			})
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

			if (this.__options.printPageErrors) {
				// TODO check this is working
				this.__client.Runtime.exceptionThrown((e) => {
					console.log(`> Tab ${this.__uniqueTabId}: Page JavaScript error: ${e.exceptionDetails.text}`)
				})
			}

		}).then(() => {
			callback(null)
		}).catch((err) => {
			callback(`error when initializing new chrome tab: ${err}`)
		})

	}

	__cdpCallFailed(err, res, errorText, callback) {
		if ((typeof err === "boolean") && _.isPlainObject(res)) {
			callback(`${errorText}: ${"TODO"}`)
		} else {
			if (typeof err === "string") {
				callback(`${errorText}: ${err}`)
			} else {
				callback(errorText)
			}
		}
	}

	// allow the end user to do more specific things by using the driver directly
	get client() { return this.__client }

	get closed() { return this.__closed }

	_close(callback) {
		this.__client.close(() => {
			const CDP = require("chrome-remote-interface")
			CDP.Close({ id: this.__cdpTargetId }, (err, res) => {
				this.__closed = true // mark the tab as closed in all cases because we don't know how to recover
				if (err) {
					this.__cdpCallFailed(err, res, "failed to close chrome tab", callback)
				} else {
					callback(null)
				}
			})
		})
	}

	_open(url, options, callback) {
		// TODO handle options (POST etc)
		// TODO control timeout, abort on slow requests
		this.__client.Page.navigate({ url: url }, (err, res) => {
			if (err) {
				this.__cdpCallFailed(err, res, "failed to make chrome navigate", callback)
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

	_waitUntilVisible(selectors, duration, operator, callback) { this.__callWaitMethod('until', 'visible', selectors, duration, operator, callback) }
	_waitWhileVisible(selectors, duration, operator, callback) { this.__callWaitMethod('while', 'visible', selectors, duration, operator, callback) }
	_waitUntilPresent(selectors, duration, operator, callback) { this.__callWaitMethod('until', 'present', selectors, duration, operator, callback) }
	_waitWhilePresent(selectors, duration, operator, callback) { this.__callWaitMethod('while', 'present', selectors, duration, operator, callback) }
	__callWaitMethod(waitType, visType, selectors, duration, operator, callback) {
		const waiterToInject = (waitType, visType, selectors, timeLeft, timeSpent, operator) => {
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
							if ((start + timeLeft) < Date.now()) {
								reject(`waited ${timeSpent + (Date.now() - start)}ms but element "${invalidSelector}" still ${waitType === 'while' ? '' : 'not '}${visType}`)
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
							if ((start + timeLeft) < Date.now()) {
								let elementsToString = selectors.slice()
								for (let e of elementsToString) {
									e = `"${e}"`
								}
								elementsToString = elementsToString.join(', ')
								reject(`waited ${timeSpent + (Date.now() - start)}ms but element${selectors.length > 0 ? 's' : ''} ${elementsToString} still ${waitType === 'while' ? '' : 'not '}${visType}`)
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
		const tryToWait = (timeLeft, timeSpent) => {
			console.log(" ===> tryToWait with time left of " + timeLeft + ", time spent " + timeSpent)
			const payload = {
				expression: `(${waiterToInject})("${waitType}", "${visType}", ${JSON.stringify(selectors)}, ${timeLeft}, ${timeSpent}, "${operator}")`,
				awaitPromise: true,
				returnByValue: true,
				silent: true,
				includeCommandLineAPI: false,
			}
			const start = Date.now()
			this.__client.Runtime.evaluate(payload, (err, res) => {
				if (err) {
					if (_.has(res, "message") && (res.message === "Promise was collected")) {
						console.log("Promise was collected!")
						const timeElapsed = Date.now() - start
						tryToWait((timeLeft - timeElapsed), (timeSpent + timeElapsed))
					} else {
						this.__cdpCallFailed(err, res, `failed to make chrome wait ${waitType} ${visType}`, callback)
					}
				} else {
					// TODO return matching selector if available
					// TODO check for exceptions
					console.log(`tryToWait result: ${JSON.stringify(res, undefined, 2)}`)
					callback(null, null)
				}
			})
		}
		tryToWait(duration, 0)
	}

	_click(selector, options, callback) {
		// TODO use options
		// TODO support real mouse click using Input domain
		const click = (selector) => {
			const target = document.querySelector(selector)
			if (target) {
				// heavily inspired from CasperJS' clientutils click method
				let posX = 0.5
				let posY = 0.5
				try {
					const bounds = target.getBoundingClientRect()
					posX = Math.floor(bounds.width  * (posX - (posX ^ 0)).toFixed(10)) + (posX ^ 0) + bounds.left
					posY = Math.floor(bounds.height * (posY - (posY ^ 0)).toFixed(10)) + (posY ^ 0) + bounds.top
				} catch (e) {
					posX = 1
					posY = 1
				}
				target.dispatchEvent(new MouseEvent("click", {
					bubbles: true,
					cancelable: true,
					view: window,
					detail: 1, // "click count"
					screenX: 1,
					screenY: 1,
					clientX: posX,
					clientY: posY,
					ctrlKey: false,
					altKey: false,
					shiftKey: false,
					metaKey: false,
					button: 0, // "main button" (usually left)
					relatedTarget: target,
				}))
			} else {
				throw 'cannot find selector'
			}
		}
		const payload = {
			expression: `(${click})(${JSON.stringify(selector)})`,
			returnByValue: true,
			silent: true,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			if (err) {
				this.__cdpCallFailed(err, res, "click: failed to click on target element", callback)
			} else {
				// TODO process res, check errors
				callback(null)
			}
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
				// TODO make the function run with window as this
				func(arg, done)
			})
		}
		const payload = {
			expression: `(${runEval})((${func}), ${JSON.stringify(arg)})`,
			awaitPromise: true,
			returnByValue: true,
			silent: true,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			if (err) {
				this.__cdpCallFailed(err, res, "evaluate: code evaluation failed", callback)
			} else {
				//console.log(`evaluate result: ${JSON.stringify(res, undefined, 2)}`)
				callback(null, res.result.value)
			}
		})
	}

	_getUrl(callback) {
		const payload = {
			expression: "window.location.href",
			returnByValue: true,
			silent: true,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			if (err) {
				this.__cdpCallFailed(err, res, "getUrl: could not get the current url", callback)
			} else {
				callback(null, res.result.value)
			}
		})
	}

	_getContent(callback) {
		this.__client.DOM.getDocument((err, res) => {
			if (err) {
				this.__cdpCallFailed(err, res, "getContent: failed to get root dom node from page", callback)
			} else {
				this.__client.DOM.getOuterHTML({ nodeId: res.root.nodeId }, (err, res) => {
					if (err) {
						this.__cdpCallFailed(err, res, "getContent: failed to get outer html from root dom node", callback)
					} else {
						callback(null, res.outerHTML)
					}
				})
			}
		})
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
		// TODO use options (clipRect, selector...)
		// TODO use some Emulation domain tricks to take full page screenshots
		// TODO support PDF format
		const pathLib = require("path")
		const ext = pathLib.extname(filename).toLowerCase()
		const format = (ext === ".png" ? "png" : "jpeg")
		const payload = {
			format: format,
			fromSurface: true,
		}
		if ((format === "jpeg")) {
			payload.quality = options.quality || 75
		}
		this.__client.Page.captureScreenshot(payload, (err, res) => {
			if (err) {
				this.__cdpCallFailed(err, res, "screenshot: could not capture", callback)
			} else {
				require("fs").writeFile(filename, res.data, "base64", (err) => {
					if (err) {
						callback(`screenshot: could not write captured data to disk: ${err}`, filename)
					} else {
						callback(null, filename)
					}
				})
			}
		})
	}

	_sendKeys(selector, keys, options, callback) {
		// Guarantees:
		//  - selector: string
		//  - keys: string or number TODO confirm this
		//  - options: plain object TODO describe more
		// => callback(err)
	}

	_injectFromDisk(url, callback) {
		require("fs").readFile(url, "utf8", (err, data) => {
			if (err) {
				callback(`inject: could not read file from disk for injection into page: ${err}`)
			} else {
				this.__injectString(data, callback)
			}
		})
	}

	_injectFromUrl(url, callback) {
		const options = {
			json: false,
			parse_response: false,
			parse_cookies: false,
			// TODO set open_timeout, read_timeout according to user's timeout setting
		}
		require("needle").get(url, options, (err, res, data) => {
			if (err) {
				callback(`could not download file from url for injection into page: ${err}`)
			} else {
				if ((res.statusCode >= 200) && (res.statusCode < 300)) {
					this.__injectString(data.toString(), callback)
				} else {
					callback(`inject: could not download file from url for injection into page: got HTTP ${res.statusCode} ${res.statusMessage}`)
				}
			}
		})
	}

	__injectString(str, callback) {
		const payload = {
			expression: str,
			returnByValue: true,
			silent: true,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			if (err) {
				this.__cdpCallFailed(err, res, "inject: could not inject script into page", callback)
			} else {
				// TODO check any kind of exceptions / errors
				callback(null)
			}
		})
	}

}

module.exports = TabDriver