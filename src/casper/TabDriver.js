// Implementation of a CasperJS tab
// Properties and methods starting with _ are meant to be called by the higher-level Nick tab
// Properties and methods starting with __ are private to the driver
// Other "public" members can be accessed by the end user (with caution)
import * as _ from 'underscore'
import { create } from 'casper'

class TabDriver {

	constructor(options) {
		this.__ended = false
		this.__nextStep = null
		this.__endCallback = null

		const casperOptions = {
			verbose: false,
			colorizerType: 'Dummy',
			exitOnError: true,
			silentErrors: false,
			retryTimeout: 25,
			pageSettings: {
				localToRemoteUrlAccessEnabled: true,
				webSecurityEnabled: false,
				loadPlugins: false,
				userAgent: options.userAgent, // TODO check
				resourceTimeout: options.resourceTimeout, // TODO check
				loadImages: options.loadImages // TODO dont set because of CLI option
			},
			logLevel: 'debug',
			viewportSize: {
				width: options.width, // TODO check
				height: options.height // TODO check
			}
		}

		// only set the option if the user provided it (prevents overriding the --load-images CLI flag)
		// TODO document special case: loadImages can be absent, but not other options
		if (_.has(options, 'loadImages'))
			casperOptions.pageSettings.loadImages = options.loadImages

		this.casper = casper.create(casperOptions)

		if ((options.whitelist.length > 0) || (options.blacklist.length > 0))
			this.casper.on('resource.requested', (request, net) => {
				if (options.whitelist.length > 0) {
					let found = false
					for (white of options.whitelist)
						if (typeof white === 'string') {
							const url = request.url.toLowerCase()
							if ((url.indexOf(white) === 0) || (url.indexOf(`https://${url}`)) === 0 || (url.indexOf(`http://${url}`) === 0)) {
								found = true
								break
							}
						}
						else if (white.test(request.url)) {
							found = true
							break
						}
					if (!found) {
						if (options.printAborts)
							console.log(`> Aborted (not found in whitelist): ${request.url}`)
						return net.abort()
					}
				}
				for (const black of options.blacklist)
					if (typeof black === 'string') {
						const url = request.url.toLowerCase()
						if ((url.indexOf(white) === 0) || (url.indexOf(`https://${url}`)) === 0 || (url.indexOf(`http://${url}`) === 0)) {
							if (options.printAborts)
								console.log(`> Aborted (blacklisted by "${black}"): ${url}`)
							return net.abort()
						}
					}
					else if (black.test(request.url)) {
						if (options.printAborts)
							console.log(`> Aborted (blacklisted by ${black}): ${request.url}`)
						return net.abort()
					}
			})

		if (options.printNavigation) {
			this.casper.on('navigation.requested', (url, type, isLocked, isMainFrame) => {
				if (isMainFrame)
					console.log(`> Navigation${type !== 'Other' ? ` (${type})` : ''}${isLocked ? '' : ' (not locked)'}: ${url}`)
			})
			this.casper.on('page.created', (page) => {
				console.log('> New PhantomJS WebPage created')
				page.onResourceTimeout = (request) => console.log(`> Timeout: ${request.url}`)
			})
		}

		if (options.printPageErrors)
			this.casper.on('page.error', (err) => {
				console.log(`> Page JavaScrit error: ${err}`)
			})

		if (options.printResourceErrors)
			this.casper.on('resource.error', (err) => {
				if (err.errorString === 'Protocol "" is unknown') // when a resource is aborted (net.abort()), this error is generated
					return
				let message = `> Resource error: ${err.status != null ? `${err.status} - ` : ''}${err.statusText != null ? `${err.statusText} - ` : ''}${err.errorString}`
				if ((typeof(err.url) === 'string') && (message.indexOf(err.url) < 0))
					message += ` (${err.url})`
				console.log(message)
			})

		// open() error detection
		// it's a LOT of code just to show a relevant error message when open() fails
		// but it's necessary
		this.__openState = {
			inProgress: false,
			error: null,
			httpCode: null,
			httpStatus: null,
			url: null,
			last50Errors: []
		}
		// collects errors to get the most important thing: the errorString field
		this.casper.on('resource.error', (error) => {
			if (this.__openState.inProgress) {
				this.__openState.last50Errors.push(error)
				if (this.__openState.last50Errors.length > 50)
					this.__openState.last50Errors.shift()
			}
		})
		// this event always arrives after the eventual resource.error events
		// so we search back in our history of errors to find the corresponding errorString
		this.casper.on('page.resource.received', (resource) => {
			if (this.__openState.inProgress) {
				if (typeof(resource.status) !== 'number') {
					this.__openState.error = 'unknown error'
					if (typeof(resource.id) === 'number')
						for (let err of this.__openState.last50Errors)
							if (resource.id === err.id)
								if (typeof(err.errorString) === 'string')
									this.__openState.error = err.errorString
				} else
					this.__openState.httpCode = resource.status
				this.__openState.httpStatus = resource.statusText
				this.__openState.url = resource.url
			}
		})

		// start the CasperJS wait loop
		this.casper.start(null, null)
		waitLoop = () => {
			this.casper.wait(10)
			this.casper.then(() => {
				if (!this._ended) {
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
		this.casper.run(() => {
			if (this._endCallback != null)
				this._endCallback()
		})
	}

	isClosed() {
		return this.__ended
	}

	// this might not need to be a method
	__addStep(step) {
		this.__nextStep = step
	}

	_open(url, options, callback) {
		this.__addStep(() => {
			this.casper.clear()
			this.__openState.inProgress = true
			this.__openState.error = null
			this.__openState.httpCode = null
			this.__openState.httpStatus = null
			this.__openState.url = null
			this.casper.thenOpen(url, options)
			this.casper.then(() => {
				this.__openState.inProgress = false
				this.__openState.last50Errors = []
				// we must either have an error or an http code
				// if we dont, no page.resource.received event was never received (we consider this an error except for file:// urls)
				if ((this.__openState.error != null) || (this.__openState.httpCode != null))
					callback(this.__openState.error, this.__openState.httpCode, this.__openState.httpStatus, this.__openState.url)
				else
					if (url.trim().toLowerCase().indexOf('file://') === 0)
						// no network requests are made for file:// urls, so we ignore the fact that we did not receive any event
						callback(null, null, this.__openState.httpStatus, this.__openState.url)
					else
						callback('unknown error', null, this.__openState.httpStatus, this.__openState.url)
			})
		})
	}

	_injectFromDisk(url, callback) { __callCasperInjectMethod('injectJs', url, callback) }
	_injectFromUrl(url, callback) { __callCasperInjectMethod('includeJs', url, callback) }
	__callCasperInjectMethod(method, url, callback) {
		this.__addStep(() => {
			let err = null
			try {
				this.casper.page[method](url)
			} catch (e) {
				err = e.toString()
			}
			callback(err)
		})
	}

	_waitUntilVisible(selectors, duration, condition, callback) { __callCasperWaitMethod('waitUntilVisible', selectors, duration, condition, callback) }
	_waitWhileVisible(selectors, duration, condition, callback) { __callCasperWaitMethod('waitWhileVisible', selectors, duration, condition, callback) }
	_waitUntilPresent(selectors, duration, condition, callback) { __callCasperWaitMethod('waitForSelector', selectors, duration, condition, callback) }
	_waitWhilePresent(selectors, duration, condition, callback) { __callCasperWaitMethod('waitWhileSelector', selectors, duration, condition, callback) }
	__callCasperWaitMethod(method, selectors, duration, condition, callback) {
		this.__addStep(() => {
			const start = Date.now()
			let index = 0
			if (condition === 'and')
				var nextSelector = () => {
					const success = () => {
						++index
						if (index >= selectors.length)
							callback(null, null)
						else {
							duration -= (Date.now() - start)
							if (duration < (this.casper.options.retryTimeout * 2))
								duration = (this.casper.options.retryTimeout * 2)
							nextSelector()
						}
					}
					const failure = () =>
						callback(`waited ${Date.now() - start}ms but element "${selectors[index]}" still ${method.indexOf('While') > 0 ? '' : 'not '}${method.indexOf('Visible') > 0 ? 'visible' : 'present'}`)
					this.casper[method](selectors[index], success, failure, duration)
				}
			else {
				let waitedForAll = false
				var nextSelector = () => {
					const success = () => {
						callback(null, selectors[index])
					}
					const failure = () => {
						if (waitedForAll && ((start + duration) < Date.now())) {
							let elementsToString = selectors.slice()
							for (let e of elementsToString)
								e = `"${e}"`
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
					this.casper[method](selectors[index], success, failure, (this.casper.options.retryTimeout * 2))
				}
			}
			nextSelector()
		})
	}

}

export default TabDriver
