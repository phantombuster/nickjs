import * as _ from 'underscore'

class TabDriver {

	constructor(options) {
		this.ended = false
		this._nextStep = null
		this._stepIsRunning = false
		this._endCallback = null

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
					const found = false
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
					message += " (#{err.url})"
				console.log(message)
			})

		// open() error detection
		this._openState = {
			inProgress: false,
			error: null,
			httpCode: null,
			httpStatus: null,
			url: null,
			last50Errors: []
		}
		// collects errors to get the most important thing: the errorString field
		this.casper.on('resource.error', (error) => {
			if (this._openState.inProgress)
				this._openState.last50Errors.push(error)
				if (this._openState.last50Errors.length > 50)
					this._openState.last50Errors.shift()
		})
		// this event always arrives after the eventual resource.error events
		// so we search back in our history of errors to find the corresponding errorString
		this.casper.on('page.resource.received', (resource) => {
			if (this._openState.inProgress)
				if (typeof(resource.status) != 'number') {
					this._openState.error = 'unknown error'
					if (typeof(resource.id) === 'number')
						for (let err of this._openState.last50Errors)
							if (resource.id === err.id)
								if (typeof(err.errorString) === 'string')
									this._openState.error = err.errorString
				} else
					this._openState.httpCode = resource.status
				this._openState.httpStatus = resource.statusText
				this._openState.url = resource.url
		})

		// start the CasperJS wait loop
		this.casper.start(null, null)
		waitLoop = () => {
			this.casper.wait(10)
			this.casper.then(() => {
				if (!this._ended) {
					if (this._nextStep != null) {
						const step = this._nextStep
						this._nextStep = null
						this._stepIsRunning = true
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

	_addStep(step) {
		this._nextStep = step
	}

	open(url, options, callback) {
		this._addStep(() => {
			this.casper.clear()
			this._openState.inProgress = true
			this._openState.error = null
			this._openState.httpCode = null
			this._openState.httpStatus = null
			this._openState.url = null
			this.casper.thenOpen(url, options)
			this.casper.then(() => {
				this._stepIsRunning = false
				this._openState.inProgress = false
				this._openState.last50Errors = []
				// we must either have an error or an http code
				// if we dont, no page.resource.received event was never received (we consider this an error except for file:// urls)
				if ((this._openState.error != null) || (this._openState.httpCode != null))
					callback(this._openState.error, this._openState.httpCode, this._openState.httpStatus, this._openState.url)
				else
					if (url.trim().toLowerCase().indexOf('file://') === 0)
						// no network requests are made for file:// urls, so we ignore the fact that we did not receive any event
						callback(null, null, this._openState.httpStatus, this._openState.url)
					else
						callback('unknown error', null, this._openState.httpStatus, this._openState.url)
			})
		})
	}

	injectFromDisk(url, callback) { _callCasperInjectMethod('injectJs', url, callback) }
	injectFromUrl(url, callback) { _callCasperInjectMethod('includeJs', url, callback) }
	_callCasperInjectMethod(method, url, callback) {
		this._addStep(() => {
			let err = null
			try {
				this.casper.page[method](url)
			} catch (e) {
				err = e.toString()
			}
			this._stepIsRunning = false
			callback(err)
		})
	}

	waitUntilVisible(selectors, duration, condition, callback) { _callCasperWaitMethod('waitUntilVisible', selectors, duration, condition, callback) }
	waitWhileVisible(selectors, duration, condition, callback) { _callCasperWaitMethod('waitWhileVisible', selectors, duration, condition, callback) }
	waitUntilPresent(selectors, duration, condition, callback) { _callCasperWaitMethod('waitForSelector', selectors, duration, condition, callback) }
	waitWhilePresent(selectors, duration, condition, callback) { _callCasperWaitMethod('waitWhileSelector', selectors, duration, condition, callback) }
	_callCasperWaitMethod(method, selectors, duration, condition, callback) {
		this._addStep(() => {
			const start = Date.now()
			let index = 0
			if (condition === 'and') {
				var nextSelector = () => {
					const success = () => {
						++index
						if (index >= selectors.length) {
							this._stepIsRunning = false
							callback(null, null)
						} else {
							duration -= (Date.now() - start)
							if (duration < (this.casper.options.retryTimeout * 2))
								duration = (this.casper.options.retryTimeout * 2)
							nextSelector()
						}
					}
					const failure = () => {
						this._stepIsRunning = false
						callback(`waited ${Date.now() - start}ms but element "${selectors[index]}" still ${method.indexOf('While') > 0 ? '' : 'not '}${method.indexOf('Visible') > 0 ? 'visible' : 'present'}`)
					}
					this.casper[method](selectors[index], success, failure, duration)
				}
			} else {
				let waitedForAll = false
				var nextSelector = () => {
					const success = () =>
						this._stepIsRunning = false
						callback(null, selectors[index])
					const failure = () => {
						if (waitedForAll && ((start + duration) < Date.now())) {
							this._stepIsRunning = false
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
