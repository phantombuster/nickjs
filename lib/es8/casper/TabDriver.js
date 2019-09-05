// Properties starting with _ are meant for the higher-level Nick tab or browser driver
// Properties starting with __ are private to the driver
// The read-only property "casper" can be accessed by the end-user (if he knows what he's doing)

// Note: this file needs to have "var require = patchRequire(require);" before requiring casper
// See http://docs.casperjs.org/en/latest/writing_modules.html
// An ugly post-processing is done (after babel) to add this line (see npm scripts)

const _ = require("lodash")
const casper = require("casper")

class TabDriver {

	constructor(uniqueTabId, options) {
		this.__uniqueTabId = uniqueTabId
		this.__closed = false
		this.__crashed = false
		this.__endCallback = null
		this.__nextStep = null

		// these two are set to their default values just after construction by the higher-level Nick tab
		this._onConfirm = null
		this._onPrompt = null

		let casperOptions = {
			verbose: false,
			colorizerType: 'Dummy',
			exitOnError: true,
			silentErrors: false,
			retryTimeout: 25,
			pageSettings: {
				localToRemoteUrlAccessEnabled: true,
				webSecurityEnabled: false,
				loadPlugins: false,
				userAgent: options.userAgent,
				resourceTimeout: options.timeout
			},
			logLevel: 'debug',
			viewportSize: {
				width: options.width,
				height: options.height
			}
		}

		// unlike other options, this one can be absent
		// only set the option if the end user provided it (prevents overriding the --load-images CLI flag)
		if (_.has(options, 'loadImages')) {
			casperOptions.pageSettings.loadImages = options.loadImages
		}

		if (options.additionalChildOptions.length > 0) {
			casperOptions = _.merge(
				{},
				options.additionalChildOptions,
				casperOptions
			);
		}

		this.__casper = casper.create(casperOptions)

		if ((options.whitelist.length > 0) || (options.blacklist.length > 0)) {
			this.__casper.on('resource.requested', (request, net) => {
				if (options.whitelist.length > 0) {
					let found = false
					for (const white of options.whitelist) {
						if (typeof white === 'string') {
							const url = request.url.toLowerCase()
							if ((url.indexOf(white) === 0) || (url.indexOf(`https://${white}`) === 0) || (url.indexOf(`http://${white}`) === 0)) {
								found = true
								break
							}
						} else if (white.test(request.url)) {
							found = true
							break
						}
					}
					if (!found) {
						if (options.printAborts) {
							console.log(`> Tab ${this.id}: Aborted (not found in whitelist): ${request.url}`)
						}
						return net.abort()
					}
				}
				for (const black of options.blacklist) {
					if (typeof black === 'string') {
						const url = request.url.toLowerCase()
						if ((url.indexOf(black) === 0) || (url.indexOf(`https://${black}`) === 0) || (url.indexOf(`http://${black}`) === 0)) {
							if (options.printAborts) {
								console.log(`> Tab ${this.id}: Aborted (blacklisted by "${black}"): ${url}`)
							}
							return net.abort()
						}
					} else if (black.test(request.url)) {
						if (options.printAborts) {
							console.log(`> Tab ${this.id}: Aborted (blacklisted by ${black}): ${request.url}`)
						}
						return net.abort()
					}
				}
			})
		}

		if (options.printNavigation) {
			this.__casper.on('navigation.requested', (url, type, isLocked, isMainFrame) => {
				if (isMainFrame) {
					console.log(`> Tab ${this.id}: Navigation${type !== 'Other' ? ` (${type})` : ''}${isLocked ? '' : ' (not locked)'}: ${url}`)
				}
			})
		}

		this.__casper.on('page.created', (page) => {
			if (options.httpProxy) {
				page.setProxy(options.httpProxy)
				console.log("CasperJS page proxy set to " + options.httpProxy)
			}
			if (options.printNavigation) {
				console.log(`> Tab ${this.id}: New PhantomJS WebPage created`)
				page.onResourceTimeout = (request) => console.log(`> Tab ${this.id}: Timeout: ${request.url}`)
			}
		})

		if (options.printPageErrors) {
			this.__casper.on('page.error', (err) => {
				console.log(`> Tab ${this.id}: Page JavaScript error: ${err}`)
			})
		}

		if (options.printResourceErrors) {
			this.__casper.on('resource.error', (err) => {
				if (err.errorString === 'Protocol "" is unknown') { // when a resource is aborted (net.abort()), this error is generated
					return
				}
				let message = `> Tab ${this.id}: Resource error: ${err.status != null ? `${err.status} - ` : ''}${err.statusText != null ? `${err.statusText} - ` : ''}${err.errorString}`
				if ((typeof(err.url) === 'string') && (message.indexOf(err.url) < 0)) {
					message += ` (${err.url})`
				}
				console.log(message)
			})
		}

		// maintain a state for monitoring the result of inject/open operations
		this.__last50Errors = []
		this.__openInProgress = false
		this.__injectInProgress = false
		this.__fetchState = {
			error: null,
			httpCode: null,
			httpStatus: null,
			url: null
		}
		// when an inject/open is in progress, keep the last errors that occur
		// we'll iterate through this array to find the corresponding error if necessary
		this.__casper.on('resource.error', (error) => {
			if (this.__openInProgress || this.__injectInProgress) {
				this.__last50Errors.push(error)
				if (this.__last50Errors.length > 50) {
					this.__last50Errors.shift()
				}
			}
		})
		// when an open is in progress, look for a 'page received' event to know if it was OK or not
		// if it failed, augment the error with details found in our stored error array
		// (the open() casperjs call will finish after the event was received)
		this.__casper.on('page.resource.received', (resource) => {
			if (this.__openInProgress) {
				if (typeof(resource.status) !== 'number') {
					this.__fetchState.error = 'unknown error'
					if (typeof(resource.id) === 'number') {
						for (const err of this.__last50Errors) {
							if (resource.id === err.id) {
								if (typeof(err.errorString) === 'string') {
									this.__fetchState.error = err.errorString
								}
							}
						}
					}
				} else {
					this.__fetchState.httpCode = resource.status
				}
				this.__fetchState.httpStatus = resource.statusText
				this.__fetchState.url = resource.url
			}
		})
		// when an inject is in progress, look at any 'resource received' event with the corresponding URL
		// (if the inject has a 3xx redirect, change which URL we monitor)
		// if the request fails, augment the error with details found in out stored error array
		// (the includeJs() casperjs call will finish before these event are received)
		this.__casper.on('resource.received', (resource) => {
			if (this.__injectInProgress) {
				if (resource.url === this.__fetchState.url) {
					if (typeof(resource.redirectURL) === 'string') {
						this.__fetchState.url = resource.redirectURL
					} else if (resource.stage === 'end') {
						this.__fetchState.httpCode = resource.status
						this.__fetchState.httpStatus = resource.statusText
						this.__fetchState.url = resource.url
						if (typeof(resource.status) !== 'number') {
							this.__fetchState.error = 'unknown error'
							if (typeof(resource.id) === 'number') {
								for (const err of this.__last50Errors) {
									if (resource.id === err.id) {
										if (typeof(err.errorString) === 'string') {
											this.__fetchState.error = err.errorString
										}
									}
								}
							}
						} else if ((resource.status < 200) || (resource.status >= 300)) {
							this.__fetchState.error = `got HTTP ${resource.status} ${resource.statusText} when downloading ${resource.url}`
						}
						this.__injectInProgress = false
						this.__last50Errors = []
					}
				}
			}
		})

		// better logging of stack trace
		// (is it a good idea to override this on every new tab instance?
		//  but we need to because casperjs does it anyway and logs nothing...)
		phantom.onError = (msg, trace) => {
			console.log(`\n${msg}`)
			if (trace && trace.length) {
				for (const f of trace) {
					console.log(` at ${f.file || f.sourceURL}:${f.line}${f.function ? ` (in function ${f.function})` : ''}`)
				}
			}
			console.log('')
			phantom.exit(1)
		}

		// Start the CasperJS wait loop
		// To forget about this weird system of "steps" that CasperJS has,
		// we check every 10ms if we need to execute a new action, otherwise we wait()
		this.__casper.start(null, null)
		const waitLoop = () => {
			this.__casper.wait(10)
			this.__casper.then(() => {
				if (this.__endCallback == null) {
					if (this.__nextStep != null) {
						const step = this.__nextStep
						this.__nextStep = null
						step()
					}
					waitLoop()
				}
			})
		}
		waitLoop()
		this.__casper.run(() => {
			// executed on close (the wait loop has ended)
			this.__closed = true
			if (typeof this.__endCallback === 'function') {
				this.__endCallback(null)
			}
			// not so sure about the following lines
			// the goal is to facilitate GC
			this.__endCallback = null
			this.__casper.removeAllListeners('resource.requested')
			this.__casper.removeAllListeners('navigation.requested')
			this.__casper.removeAllListeners('page.created')
			this.__casper.removeAllListeners('page.error')
			this.__casper.removeAllListeners('resource.error')
			this.__casper.removeAllListeners('page.resource.received')
			this.__casper.removeAllListeners('resource.received')
			this.__casper.page.clearMemoryCache() // this might not be a good idea considering this is not page-specific (seems to clear the whole cache...)
			this.__casper.page.close()
			delete this.__casper.page
			this.__casper = null
		})

		// TODO: this is not working at all, why? (tests are skipped)
		this.__casper.setFilter("page.confirm", (msg) => {
			return this._onConfirm(msg)
		})
		this.__casper.setFilter("page.prompt", (msg) => {
			return this._onPrompt(msg)
		})
	}

	// allow the end user to do more specific things by using the driver directly
	get casper() { return this.__casper }

	get closed() { return this.__closed }
	get crashed() { return this.__crashed }
	get id() { return this.__uniqueTabId }

	_close(callback) {
		this.__endCallback = callback
	}

	_open(url, options, callback) {
		this.__nextStep = () => {
			this.__casper.clear() // stops the current page from doing anything else (that way if a wait*() is done right after the open(), we're sure of looking on the new page)
			this.__openInProgress = true
			this.__fetchState.error = null
			this.__fetchState.httpCode = null
			this.__fetchState.httpStatus = null
			this.__fetchState.url = null
			this.__casper.thenOpen(url, options)
			this.__casper.then(() => {
				this.__openInProgress = false
				this.__last50Errors = []
				// we must either have an error or an http code
				// if we dont, no page.resource.received event was never received (we consider this an error except for file:// urls)
				if ((this.__fetchState.error != null) || (this.__fetchState.httpCode != null)) {
					callback(this.__fetchState.error, this.__fetchState.httpCode, this.__fetchState.httpStatus, this.__fetchState.url)
				} else {
					if (url.trim().toLowerCase().indexOf('file://') === 0) {
						// no network requests are made for file:// urls, so we ignore the fact that we did not receive any event
						callback(null, null, this.__fetchState.httpStatus, this.__fetchState.url)
					} else {
						callback('unknown error', null, this.__fetchState.httpStatus, this.__fetchState.url)
					}
				}
			})
		}
	}

	_waitUntilVisible(selectors, duration, condition, callback) { this.__callCasperWaitMethod('waitUntilVisible', selectors, duration, condition, callback) }
	_waitWhileVisible(selectors, duration, condition, callback) { this.__callCasperWaitMethod('waitWhileVisible', selectors, duration, condition, callback) }
	_waitUntilPresent(selectors, duration, condition, callback) { this.__callCasperWaitMethod('waitForSelector', selectors, duration, condition, callback) }
	_waitWhilePresent(selectors, duration, condition, callback) { this.__callCasperWaitMethod('waitWhileSelector', selectors, duration, condition, callback) }
	__callCasperWaitMethod(method, selectors, duration, condition, callback) {
		this.__nextStep = () => {
			const start = Date.now()
			let index = 0
			if (condition === 'and') {
				var nextSelector = () => {
					const success = () => {
						++index
						if (index >= selectors.length) {
							callback(null, null)
						} else {
							duration -= (Date.now() - start)
							if (duration < (this.__casper.options.retryTimeout * 2)) {
								duration = (this.__casper.options.retryTimeout * 2)
							}
							nextSelector()
						}
					}
					const failure = () => {
						callback(`waited ${Date.now() - start}ms but element "${selectors[index]}" still ${method.indexOf('While') > 0 ? '' : 'not '}${method.indexOf('Visible') > 0 ? 'visible' : 'present'}`)
					}
					this.__casper[method](selectors[index], success, failure, duration)
				}
			} else {
				let waitedForAll = false
				var nextSelector = () => {
					const success = () => {
						callback(null, selectors[index])
					}
					const failure = () => {
						if (waitedForAll && ((start + duration) < Date.now())) {
							let elementsToString = selectors.slice()
							for (let e of elementsToString) {
								e = `"${e}"`
							}
							elementsToString = elementsToString.join(', ')
							callback(`waited ${Date.now() - start}ms but element${selectors.length > 0 ? 's' : ''} ${elementsToString} still ${method.indexOf('While') > 0 ? '' : 'not '}${method.indexOf('Visible') > 0 ? 'visible' : 'present'}`, null)
						} else {
							++index
							if (index >= selectors.length) {
								waitedForAll = true
								index = 0
							}
							nextSelector()
						}
					}
					this.__casper[method](selectors[index], success, failure, (this.__casper.options.retryTimeout * 2))
				}
			}
			nextSelector()
		}
	}

	_click(selector, options, callback) {
		this.__nextStep = () => {
			try {
				// TODO mouseEmulation option => use mouse module of CasperJS
				this.__casper.click(selector)
				callback(null)
			} catch (e) {
				callback(e.toString())
			}
		}
	}

	_evaluate(func, arg, callback) {
		this.__nextStep = () => {
			let err = null
			try {
				f = (__arg, __code) => { // added __ to prevent accidental casperjs parsing of object param
					let cb = (err, res) => {
						window.__evaluateAsyncFinished = true
						window.__evaluateAsyncErr = err
						window.__evaluateAsyncRes = res
					}
					try {
						window.__evaluateAsyncFinished = false
						window.__evaluateAsyncErr = null
						window.__evaluateAsyncRes = null
						eval(`(${__code})`)(__arg, cb)
						return undefined
					} catch (e) {
						return e.toString()
					}
				}
				err = this.__casper.evaluate(f, arg, func.toString())
				if (err != null) {
					err = `in evaluated code (initial call): ${err}`
				}
			} catch (e) {
				err = `in casper context (initial call): ${e.toString()}`
			}
			if (err != null) {
				callback(err, null)
			} else {
				check = () => {
					try {
						const res = this.__casper.evaluate(() => {
							// TODO check for res object too complicated for serialization and set err accordingly (jQuery, functions, ...)
							return {
								finished: window.__evaluateAsyncFinished,
								err: (window.__evaluateAsyncErr != null ? window.__evaluateAsyncErr : undefined), // PhantomJS bug: null gets converted to "", undefined is kept
								res: (window.__evaluateAsyncRes != null ? window.__evaluateAsyncRes : undefined)
							}
						})
						if (res.finished) {
							callback((res.err === undefined ? null : res.err), (res.res === undefined ? null : res.res)) // convert undefined back to null
						} else {
							setTimeout(check, 200)
						}
					} catch (e) {
						callback(`in casper context (callback): ${e.toString()}`, null)
					}
				}
				setTimeout(check, 100)
			}
		}
	}

	_getUrl(callback) {
		this.__nextStep = () => {
			try {
				callback(null, this.__casper.getCurrentUrl())
			} catch (e) {
				callback(e.toString())
			}
		}
	}

	_getContent(callback) {
		this.__nextStep = () => {
			try {
				callback(null, this.__casper.getPageContent())
			} catch (e) {
				callback(e.toString())
			}
		}
	}

	_fill(selector, params, options, callback) {
		this.__nextStep = () => {
			try {
				this.__casper.fill(selector, params, options.submit)
				callback(null)
			} catch (e) {
				callback(e.toString())
			}
		}
	}

	_screenshot(filename, options, callback) {
		this.__nextStep = () => {
			try {
				// TODO use options: clipRect, selector...
				// TODO allow empty filename => return base64
				// TODO check pdf support
				this.__casper.capture(filename)
				callback(null, filename)
			} catch (e) {
				callback(e.toString())
			}
		}
	}

	_sendKeys(selector, keys, options, callback) {
		this.__nextStep = () => {
			try {
				this.__casper.sendKeys(selector, keys, options)
				callback(null)
			} catch (e) {
				callback(e.toString())
			}
		}
	}

	_injectFromDisk(path, callback) {
		this.__nextStep = () => {
			try {
				// contrary to includeJs(), injectJs() returns a boolean
				// try-catch just in case...
				var ret = this.__casper.page.injectJs(path)
			} catch (e) {
				callback(`failed to inject local script "${path}": ${e.toString()}`)
				return
			}
			if (ret) {
				callback(null)
			} else {
				callback(`failed to inject local script "${path}"`)
			}
		}
	}

	_injectFromUrl(url, callback) {
		this.__nextStep = () => {
			this.__injectInProgress = true
			this.__fetchState.url = url.trim() // minimize the risk of not catching the resource.received event (might need more than a trim())
			try {
				// includeJs() seems to return undefined in all cases
				// try-catch just in case...
				this.__casper.page.includeJs(this.__fetchState.url)
			} catch (e) {
				this.__injectInProgress = false
				callback(e.toString())
				return
			}
			this.__fetchState.error = null
			this.__fetchState.httpCode = null
			this.__fetchState.httpStatus = null
			const injectStart = Date.now()
			waitForInject = () => {
				setTimeout(() => {
					if (this.__injectInProgress) {
						// add 1s to let the resource timeout by itself and generate a real resource.error event
						if ((Date.now() - injectStart) > (this.__casper.page.settings.resourceTimeout + 1000)) {
							callback(`injection of script "${this.__fetchState.url}" timed out after ${Date.now() - injectStart}ms`)
						} else {
							waitForInject()
						}
					} else {
						// TODO the Chrome driver doesn't return these values => update one of the drivers so that they all return the same things from inject()
						callback(this.__fetchState.error, this.__fetchState.httpCode, this.__fetchState.httpStatus, this.__fetchState.url)
					}
				}, 100)
			}
			waitForInject()
		}
	}

	_scroll(x, y, callback) {
		this.__nextStep = () => {
			try {
				this.__casper.scrollTo(x, y)
				callback(null)
			} catch (e) {
				callback(e.toString())
			}
		}
	}

	_scrollToBottom(callback) {
		this.__nextStep = () => {
			try {
				this.__casper.scrollToBottom()
				callback(null)
			} catch (e) {
				callback(e.toString())
			}
		}
	}

}

module.exports = TabDriver
