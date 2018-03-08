// Properties starting with _ are meant for the higher-level Nick tab or browser driver
// Properties starting with __ are private to the driver
// The read-only property "client" can be accessed by the end-user (if he knows what he's doing)

const _ = require('lodash')

class TabDriver {

	constructor(uniqueTabId, options, client, cdpTargetId) {
		this.__closed = false
		this.__crashed = false
		this.__uniqueTabId = uniqueTabId
		this.__options = options
		this.__client = client
		this.__cdpTargetId = cdpTargetId

		// these two are set to their default values just after construction by the higher-level Nick tab
		this._onConfirm = null
		this._onPrompt = null
	}

	// because Chrome tab initialization is async, we have _init which is separate from the constructor
	// it's immediately called after instantiation by the browser driver
	_init(callback) {
		Promise.all([
			this.__client.Page.enable(),
			this.__client.Network.enable(),
			this.__client.Runtime.enable(),
			this.__client.Security.enable(),
		]).then(() => {

			// accept all certificates
			return this.__client.Security.setOverrideCertificateErrors({ override: true }).then(() => {
				this.__client.Security.certificateError((e) => {
					const payload = {
						eventId: e.eventId,
						action: 'continue'
					}
					this.__client.Security.handleCertificateError(payload, (err, res) => {
						err = this.__parseCdpResponse(err, res, "handleCertificateError failure")
						if (err) {
							console.log(`> Tab ${this.id}: ${err}`)
						}
					})
				})
			})

		}).then(() => {

			// request interception (only if necessary)
			if ((this.__options.whitelist.length > 0)
				|| (this.__options.blacklist.length > 0)
				|| this.__options._proxyUsername
				|| this.__options._proxyPassword
				|| (this.__options.loadImages === false)) {
				return this.__client.Network.setRequestInterception({ patterns: [{ urlPattern: "*" }] }).then(() => {
					const processRequest = (e, credentials, error, logMessage) => {
						if (logMessage && this.__options.printAborts) {
							console.log(`> Tab ${this.id}: Aborted (${logMessage}): ${e.request.url}`)
						}
						const payload = {
							interceptionId: e.interceptionId
						}
						if (error) {
							payload.errorReason = error
						}
						if (credentials) {
							payload.authChallengeResponse = credentials
						}
						this.__client.Network.continueInterceptedRequest(payload, (err, res) => {
							err = this.__parseCdpResponse(err, res, "continueInterceptedRequest failure")
							// "invalid interceptionId" errors can be safely ignored
							if (err && (err.indexOf("Invalid InterceptionId.") < 0)) {
								console.log(`> Tab ${this.id}: ${err}`)
							}
						})
					}
					this.__client.Network.requestIntercepted((e) => {
						let credentials = null
						if (e.authChallenge && (e.authChallenge.source === "Proxy") && (this.__options._proxyUsername || this.__options._proxyPassword)) {
							credentials = {
								response: "ProvideCredentials",
								username: this.__options._proxyUsername,
								password: this.__options._proxyPassword,
							}
						}
						if ((this.__options.loadImages === false) && (e.resourceType === "Image")) {
							return processRequest(e, credentials, "Aborted")
						}
						if (this.__options.whitelist.length > 0) {
							let found = false
							for (const white of this.__options.whitelist) {
								if (typeof white === "string") {
									const url = e.request.url.toLowerCase()
									if ((url.indexOf(white) === 0) || (url.indexOf(`https://${white}`)) === 0 || (url.indexOf(`http://${white}`) === 0)) {
										found = true
										break
									}
								} else if (white.test(e.request.url)) {
									found = true
									break
								}
							}
							if (!found) {
								return processRequest(e, credentials, "Aborted", "not found in whitelist")
							}
						}
						for (const black of this.__options.blacklist) {
							if (typeof black === 'string') {
								const url = e.request.url.toLowerCase()
								if ((url.indexOf(black) === 0) || (url.indexOf(`https://${black}`) === 0) || (url.indexOf(`http://${black}`) === 0)) {
									return processRequest(e, credentials, "Aborted", `blacklisted by "${black}"`)
								}
							} else if (black.test(e.request.url)) {
								return processRequest(e, credentials, "Aborted", `blacklisted by ${black}`)
							}
						}
						processRequest(e, credentials)
					})
				})
			}

		}).then(() => {
			return this.__client.Network.setUserAgentOverride({ userAgent: this.__options.userAgent })
		}).then(() => {

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
			//this.__client.Runtime.consoleAPICalled((e) => {
			//	// TODO process all args
			//	console.log(`> Tab ${this.id}: Console message: ${e.args[0].value}`)
			//})

			if (this.__options.printPageErrors) {
				// TODO check this is working as intended
				this.__client.Runtime.exceptionThrown((e) => {
					console.log(`> Tab ${this.id}: Page JavaScript error: ${this.__summarizeException(e)}`)
				})
			}

			if (this.__options.printNavigation) {
				this.__client.Page.frameScheduledNavigation((e) => {
					if (e.reason && e.url) {
						console.log(`> Tab ${this.id}: Navigation (${e.reason}): ${e.url}`)
					}
				})
			}

			//if (this.__options.proxyAuth) {
			//	const payload = {
			//		headers: {
			//			"Proxy-Authorization": this.__options.proxyAuth
			//		}
			//	}
			//	this.__client.Network.setExtraHTTPHeaders(payload, (err, res) => {
			//		err = this.__parseCdpResponse(err, res, "setExtraHTTPHeaders failure")
			//		if (err) {
			//			console.log(`> Tab ${this.id}: ${err}`)
			//		}
			//	})
			//}

			this.__client.Page.javascriptDialogOpening((e) => {
				const payload = {}
				if (e.type === "confirm") {
					payload.accept = this._onConfirm(e.message)
				} else if (e.type === "prompt") {
					const text = this._onPrompt(e.message)
					if (typeof(text) === "string") {
						payload.accept = true
						payload.promptText = text
					} else {
						payload.accept = false
						payload.promptText = ""
					}
				} else {
					payload.accept = false
				}
				this.__client.Page.handleJavaScriptDialog(payload, (err, res) => {
					err = this.__parseCdpResponse(err, res, "handleJavaScriptDialog failure")
					if (err) {
						console.log(`> Tab ${this.id}: ${err}`)
					}
				})
			})

			const setupNickJsInPage = () => {
				window.__nativePromise = Promise
			}
			this.__client.Page.addScriptToEvaluateOnNewDocument({
				source: `(${setupNickJsInPage})()`
			}, (err, res) => {
				err = this.__parseCdpResponse(err, res, "addScriptToEvaluateOnNewDocument failure")
				if (err) {
					console.log(`> Tab ${this.id}: ${err}`)
				}
			})

		}).then(() => {
			callback(null)
		}).catch((err) => {
			callback(`error when initializing new chrome tab: ${err}`)
		})
	}

	__summarizeException(e) {
		if (this.__options.debug) {
			console.log(JSON.stringify(e, undefined, 8))
		}
		if (_.isPlainObject(e.exceptionDetails.exception) && (typeof e.exceptionDetails.exception.description === "string")) {
			// we found a "description" string field in the exception details
			return e.exceptionDetails.exception.description
		} else if (_.isPlainObject(e.exceptionDetails.exception) && (typeof e.exceptionDetails.exception.value === "string")) {
			// we found a "value" string field in the exception details
			return e.exceptionDetails.exception.value
		} else {
			if (typeof e.exceptionDetails.text === "string") {
				// we found a "text" string field
				return e.exceptionDetails.text
			} else {
				// we cannot find anything interesting about this exception
				return "uncaught exception"
			}
		}
	}

	__parseCdpResponse(err, res, errorText) {
		if ((err === true) && _.isPlainObject(res)) {
			// dev tools protocol error
			return `${errorText}: DevTools protocol error: ${typeof res.message === "string" ? res.message : "unknown error"}${typeof res.code === "number" ? ` (code: ${res.code})` : ""}`
		} else if (_.isPlainObject(res) && _.isPlainObject(res.exceptionDetails)) {
			// exception from evaluate() call
			return `${errorText}: exception thrown from page: ${this.__summarizeException(res)}`
		} else if (err) {
			// generic error
			return `${errorText}: ${err}`
		} else {
			// no error
			return null
		}
	}

	// allow the end user to do more specific things by using the driver directly
	get client() { return this.__client }

	get closed() { return this.__closed }
	get crashed() { return this.__crashed }
	get id() { return this.__uniqueTabId }

	_chromeHasCrashed() {
		this.__crashed = true
	}

	_close(callback) {
		this.__client.close(() => {
			const CDP = require("chrome-remote-interface")
			CDP.Close({ id: this.__cdpTargetId }, (err, res) => {
				this.__closed = true // mark the tab as closed (we don't know how to recover anyway)
				callback(this.__parseCdpResponse(err, res, "failed to close chrome tab"))
			})
		})
	}

	_open(url, options, callback) {
		// stores which request we'll monitor for success or failure
		let requestId = null

		// the 3 params we're going to return
		let status = null
		let statusText = null
		let newUrl = null

		// utility function to call the callback (cleans up the listeners, prevents multiple calls)
		let callbackHasFired = false
		const fireCallback = (err) => {
			if (!callbackHasFired) {
				callbackHasFired = true
				this.__client.removeListener("Network.responseReceived", responseReceived)
				this.__client.removeListener("Network.requestWillBeSent", requestWillBeSent)
				this.__client.removeListener("Page.loadEventFired", loadEventFired)
				this.__client.removeListener("Network.loadingFailed", loadingFailed)
				clearTimeout(timeoutId)
				callback(err, status, statusText, newUrl)
			}
		}

		// collects the http code (and more) from the request we're monitoring
		const responseReceived = (e) => {
			if ((e.requestId === requestId) && (status === null)) { // make sure this is the very first response we have (status is still null)
				status = e.response.status
				statusText = e.response.statusText
				newUrl = e.response.url
			}
		}

		// detects which request we should be monitoring
		const requestWillBeSent = (e) => {
			// subsequent resources of the page will generate a lot of these event
			// so we make sure we only set the requestId if we haven't got a response yet (status is still null)
			if (status === null) {
				if (e.documentURL === url || e.documentURL === `${url}/`) { // TODO this will miss some user-provided URL (for example upper-case domain names?)
					requestId = e.requestId
				}
			}
		}

		// detects when the spinner has stopped spinning
		// this is the only way for open() to be successful
		const loadEventFired = () => {
			if (this.__options.printNavigation) {
				console.log(`> Tab ${this.id}: Navigation (open): ${newUrl || url}`)
			}
			fireCallback(null)
		}

		// detects an eventual error for the request we're monitoring
		const loadingFailed = (e) => {
			if (e.requestId === requestId) {
				const errorMessage = e.errorText || "unknown error"
				if (this.__options.printNavigation) {
					console.log(`> Tab ${this.id}: Navigation (open error): ${errorMessage} (${newUrl || url})`)
				}
				fireCallback(`loading failed: ${errorMessage}`)
			}
		}

		// set up the 4 listeners we need
		this.__client.on("Network.responseReceived", responseReceived)
		this.__client.on("Network.requestWillBeSent", requestWillBeSent)
		this.__client.on("Page.loadEventFired", loadEventFired)
		this.__client.on("Network.loadingFailed", loadingFailed)

		// handle the timeout ourselves (it's possible for the spinner to spin indefinitely)
		const onTimeout = () => {
			const errorMessage = `load event did not fire after ${Date.now() - openStart}ms`
			if (this.__options.printNavigation) {
				console.log(`> Tab ${this.id}: Navigation (open timeout): ${errorMessage} (${newUrl || url})`)
			}
			fireCallback(`timeout: ${errorMessage}`)
		}
		const timeoutId = setTimeout(onTimeout, this.__options.timeout)
		const openStart = Date.now()

		// finaly, trigger the navigation to the desired URL
		this.__client.Page.navigate({ url: url }, (err, res) => {
			err = this.__parseCdpResponse(err, res, "failed to make chrome navigate")
			if (err) {
				fireCallback(err)
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
			return new window.__nativePromise((fulfill, reject) => {
				const start = Date.now()
				if (operator === "and") {
					const waitForAll = () => {
						let invalidSelector = null
						for (const sel of selectors) {
							if (!selectorMatches(sel)) {
								//console.log("+++ Missing selector: " + sel, 1234)
								invalidSelector = sel
								break
							}
						}
						if (invalidSelector) {
							if ((start + timeLeft) < Date.now()) {
								reject(`waited ${timeSpent + (Date.now() - start)}ms but element "${invalidSelector}" still ${waitType === 'while' ? '' : 'not '}${visType}`)
							} else {
								setTimeout((() => waitForAll()), 50)
							}
						} else {
							//console.log("+++ All selectors found")
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
								//console.log("+++ Found one: " + sel)
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
								//console.log("+++ Did not find any, retrying")
								setTimeout((() => waitForOne()), 50)
							}
						}
					}
					waitForOne()
				}
			})
		}
		const tryToWait = (timeLeft, timeSpent) => {
			//console.log(" ===> tryToWait with time left of " + timeLeft + ", time spent " + timeSpent)
			const payload = {
				expression: `(${waiterToInject})("${waitType}", "${visType}", ${JSON.stringify(selectors)}, ${timeLeft}, ${timeSpent}, "${operator}")`,
				awaitPromise: true,
				includeCommandLineAPI: false,
			}
			const start = Date.now()
			this.__client.Runtime.evaluate(payload, (err, res) => {
				if (_.has(res, "message") && ((res.message === "Promise was collected") || (res.message === "Execution context was destroyed."))) {
					// our code evaluation was stopped by a change of page (probably)
					// so we try again
					// console.log("Promise was collected!")
					const timeElapsed = Date.now() - start
					tryToWait((timeLeft - timeElapsed), (timeSpent + timeElapsed))
				} else {
					err = this.__parseCdpResponse(err, res, `wait ${waitType} ${visType} failure`)
					if (err) {
						callback(err)
					} else {
						if (res && (typeof res.result === "object") && (typeof res.result.value ==="string")) {
							callback(null, res.result.value)
						} else {
							callback(null, null)
						}
					}
				}
			})
		}
		tryToWait(duration, 0)
	}

	_click(selector, options, callback) {
		// TODO mouseEmulation option: real mouse click using Input domain
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
				throw `cannot find element "${selector}"`
			}
		}
		const payload = {
			expression: `(${click})(${JSON.stringify(selector)})`,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			callback(this.__parseCdpResponse(err, res, `click: failed to click on target element "${selector}"`))
		})
	}

	_evaluate(func, arg, callback) {
		const runEval = (func, arg) => {
			return new window.__nativePromise((fulfill, reject) => {
				__done = (err, res) => {
					if (err) {
						reject(err)
					} else {
						fulfill(res)
					}
				}
				// TODO make the function run with window as this
				func(arg, __done)
			})
		}
		const payload = {
			expression: `(${runEval})((${func}), ${JSON.stringify(arg)})`,
			awaitPromise: true,
			returnByValue: true,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			err = this.__parseCdpResponse(err, res, "evaluate: code evaluation failed")
			if (err) {
				callback(err, null)
			} else {
				// TODO is this enough?
				callback(null, res.result.value)
			}
		})
	}

	_getUrl(callback) {
		const payload = {
			expression: "window.location.href",
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			err = this.__parseCdpResponse(err, res, "getUrl: could not get the current url")
			if (err) {
				callback(err)
			} else {
				callback(null, res.result.value)
			}
		})
	}

	_getContent(callback) {
		this.__client.DOM.getDocument((err, res) => {
			err = this.__parseCdpResponse(err, res, "getContent: failed to get root dom node from page")
			if (err) {
				callback(err)
			} else {
				this.__client.DOM.getOuterHTML({ nodeId: res.root.nodeId }, (err, res) => {
					err = this.__parseCdpResponse(err, res, "getContent: failed to get outer html from root dom node")
					if (err) {
						callback(err)
					} else {
						callback(null, res.outerHTML)
					}
				})
			}
		})
	}

	_fill(selector, params, options, callback) {
		// TODO describe params guarantees, update skel
		// TODO support file upload
		const fillForm = (selector, params, options) => {
			const form = document.querySelector(selector)
			if (!form) {
				throw `cannot find any element matching "${selector}"`
			} else if (form.nodeName !== "FORM") {
				if (typeof form.nodeName === "string") {
					throw `element "${selector}" is a ${form.nodeName}, not a form`
				} else {
					throw `element "${selector}" is not a form`
				}
			}
			for (const inputName in params) {
				let desiredValues = params[inputName]
				if (!Array.isArray(desiredValues)) {
					desiredValues = [desiredValues]
				}
				const matchingFields = form.querySelectorAll(`[name="${inputName}"]`)
				for (const field of matchingFields) {
					try {
						field.focus()
					} catch (e) {}
					if (field.getAttribute("contenteditable")) {
						field.textContent = desiredValues[0]
					} else {
						let fieldType = field.nodeName.toLowerCase()
						if (field.getAttribute("type")) {
							fieldType = field.getAttribute("type").toLowerCase()
						}
						switch (fieldType) {
							case "checkbox":
							case "radio":
								// sometimes the user wants to check a specific checkbox with a boolean
								// other times he can specify a value or an array of values to check multiple checkboxes sharing the same name
								if ((desiredValues.length === 1) && (typeof desiredValues[0] === "boolean")) {
									field.checked = desiredValues[0]
								} else {
									field.checked = (desiredValues.indexOf(field.getAttribute("value")) >= 0)
								}
								break
							case "file":
								throw "inputs of type \"file\" are not handled yet, sorry"
							case "select":
								for (const option of field.options) {
									option.selected = (desiredValues.indexOf(option.value) >= 0)
								}
								// if the value wasnt correctly set, try setting it using the <option> texts
								if (!field.value || (!field.multiple && (field.value !== desiredValues[0]))) {
									for (const option of field.options) {
										option.selected = (desiredValues.indexOf(option.text) >= 0)
									}
								}
								break
							default:
								field.value = desiredValues[0]
						}
					}
					field.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }))
					field.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }))
					try {
						field.blur()
					} catch (e) {}
				}
			}
			if (options.submit) {
				if (!form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))) {
					throw `could not dispatch submit event to form "${selector}"`
				}
				if (typeof form.submit === "function") {
					form.submit()
				} else {
					// if an input has a name of "submit" (or an id?), the form loses its submit functon attribute
					// so we do this trick taken from https://stackoverflow.com/questions/833032/submit-is-not-a-function-error-in-javascript
					document.createElement("form").submit.call(form)
				}
			}
		}
		const payload = {
			expression: `(${fillForm})(${JSON.stringify(selector)}, ${JSON.stringify(params)}, ${JSON.stringify(options)})`,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			callback(this.__parseCdpResponse(err, res, `fill: error when filling "${selector}" form`))
		})
	}

	_screenshot(filename, options, callback) {
		// TODO allow for 'base64:png', 'base64:jpg' filename => return base64
		// TODO use options (clipRect, selector...)
		// TODO support PDF format
		const ext = require("path").extname(filename).toLowerCase()
		const format = (ext === ".png" ? "png" : "jpeg")
		const payload = {
			format: format,
			//fromSurface: true,
		}
		if ((format === "jpeg")) {
			payload.quality = options.quality || 75
		}
		const takeScreenshot = (override) => {
			const writeToDisk = (err, res) => {
				// here we're receiving err & res of captureScreenshot()
				err = this.__parseCdpResponse(err, res, "screenshot: could not capture area")
				if (err) {
					callback(err)
				} else {
					require("fs").writeFile(filename, res.data, "base64", (err) => {
						if (err) {
							callback(`screenshot: could not write captured data to disk: ${err}`, filename)
						} else {
							callback(null, filename)
						}
					})
				}
			}
			this.__client.Page.captureScreenshot(payload, (err, res) => {
				if (override) {
					override.width = this.__options.width
					override.height = this.__options.height
					this.__client.Emulation.setDeviceMetricsOverride(override, () => {
						// ignore eventual error when resetting the viewport
						// forward the err & res of captureScreenshot()
						writeToDisk(err, res)
					})
				} else {
					writeToDisk(err, res)
				}
			})
		}
		if ((typeof(options.fullPage) === 'boolean') && !options.fullPage) {
			takeScreenshot()
		} else {
			this.__client.Page.getLayoutMetrics({}, (err, res) => {
				err = this.__parseCdpResponse(err, res, "screenshot: could not get layout metrics")
				if (err) {
					callback(err)
				} else {
					const override = {
						mobile: false,
						width: Math.ceil(res.contentSize.width),
						height: Math.ceil(res.contentSize.height),
						deviceScaleFactor: 1,
						screenOrientation: {
							angle: 0,
							type: "portraitPrimary"
						}
					}
					this.__client.Emulation.setDeviceMetricsOverride(override, (err, res) => {
						err = this.__parseCdpResponse(err, res, "screenshot: could not resize viewport to full page")
						if (err) {
							callback(err)
						} else {
							takeScreenshot(override)
						}
					})
				}
			})
		}
	}

	_sendKeys(selector, keys, options, callback) {
		const focusElement = (selector) => {
			const target = document.querySelector(selector)
			if (target) {
				target.focus()
			} else {
				throw `cannot find element "${selector}"`
			}
		}
		const blurElement = (selector) => {
			const target = document.querySelector(selector)
			if (target) {
				try {
					target.blur()
				} catch (e) {}
			}
		}
		let payload = {
			expression: `(${focusElement})(${JSON.stringify(selector)})`,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			err = this.__parseCdpResponse(err, res, `sendKeys: could not focus editable element "${selector}"`)
			if (err) {
				callback(err)
			} else {
				const dispatch = (chr, type, callback) => {
					payload = {
						type: type,
						text: chr,
					}
					this.__client.Input.dispatchKeyEvent(payload, (err, res) => {
						//console.log(" -> " + type + " " + chr + " " + chr.charCodeAt(0))
						callback(this.__parseCdpResponse(err, res, "sendKeys: could not dispatch key event"))
					})
				}
				const chrIterator = (chr, callback) => {
					dispatch(chr, "keyDown", (err) => {
						if (err) {
							callback(err)
						} else {
							dispatch(chr, "keyUp", callback)
						}
					})
				}
				require("async").eachSeries(Array.from(keys), chrIterator, (err) => {
					if (err) {
						callback(err)
					} else {
						if (options.keepFocus) {
							callback(null)
						} else {
							payload = {
								expression: `(${blurElement})(${JSON.stringify(selector)})`,
								includeCommandLineAPI: false,
							}
							this.__client.Runtime.evaluate(payload, (err, res) => {
								callback(this.__parseCdpResponse(err, res, `sendKeys: could not blur editable element "${selector}"`))
							})
						}
					}
				})
			}
		})
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
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			callback(this.__parseCdpResponse(err, res, "inject: could not inject script into page"))
		})
	}

	_scroll(x, y, callback) {
		const doScroll = (x, y) => {
			window.scroll(x, y)
		}
		let payload = {
			expression: `(${doScroll})(${x}, ${y})`,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			callback(this.__parseCdpResponse(err, res, `scroll: could not scroll`))
		})
	}

	_scrollToBottom(callback) {
		const doScroll = () => {
			window.scroll(0, document.body.scrollHeight)
		}
		let payload = {
			expression: `(${doScroll})()`,
			includeCommandLineAPI: false,
		}
		this.__client.Runtime.evaluate(payload, (err, res) => {
			callback(this.__parseCdpResponse(err, res, `scrollToBottom: could not scroll to bottom`))
		})
	}

	// These 4 methods are not part of the user-facing API: they're called by the Chrome browser driver
	// because we need an open tab to make cookie requests (any open tab will do)
	_getAllCookies(callback) {
		this.__client.Network.getAllCookies({}, (err, res) => {
			err = this.__parseCdpResponse(err, res, "getAllCookies: failed to get all cookies")
			if (err) {
				callback(err)
			} else {
				callback(null, res.cookies)
			}
		})
	}
	_deleteAllCookies(callback) {
		this.__client.Network.clearBrowserCookies({}, (err, res) => {
			callback(this.__parseCdpResponse(err, res, "deleteAllCookies: failed to clear all cookies"))
		})
	}
	_deleteCookie(name, domain, callback) {
		// Chrome expects a URL and not a domain for the cookie
		// So we build a URL from the domain (if it's not already a URL)
		if ((domain.toLowerCase().indexOf("http://") !== 0) && (domain.toLowerCase().indexOf("https://") !== 0)) {
			domain = `http://${domain}`
		}
		const payload = {
			name: name,
			url: domain,
		}
		this.__client.send("Network.deleteCookies", payload, (err, res) => {
			callback(this.__parseCdpResponse(err, res, `deleteCookie: failed to delete cookie "${name}"`))
		})
	}
	_setCookie(cookie, callback) {
		// Chrome expects a URL and not a domain for the cookie
		// So we build a URL from the domain (if it's not already a URL)
		let url = cookie.domain
		if ((url.toLowerCase().indexOf("http://") !== 0) && (url.toLowerCase().indexOf("https://") !== 0)) {
			url = `http://${url}`
		}
		const payload = {
			name: cookie.name,
			value: cookie.value,
			url: url,
			expirationDate: (Math.round(Date.now() / 1000) + (365 * 24 * 60 * 60))
		}
		if (_.has(cookie, "secure")) {
			payload.secure = cookie.secure
		}
		if (_.has(cookie, "httpOnly")) {
			payload.httpOnly = cookie.httpOnly
		}
		this.__client.Network.setCookie(payload, (err, res) => {
			err = this.__parseCdpResponse(err, res, `setCookie: could not add cookie "${cookie.name}"`)
			if (err) {
				callback(err)
			} else {
				if (res.success === true) {
					callback(null)
				} else {
					callback(`setCookie: could not add cookie "${cookie.name}"`)
				}
			}
		})
	}

}

module.exports = TabDriver
