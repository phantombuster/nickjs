class Casper {

	construtor(options) {
		this._ended = false
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
				userAgent: options.userAgent // TODO check
			},
			logLevel: 'debug',
			viewportSize: {
				width: 1280,
				height: 1024
			}
		}

		let onResourceRequested = null
		if ((options.whitelist.length > 0) || (options.blacklist.length > 0))
			onResourceRequested = (request, net) => {
				if (options.whitelist.length > 0) {
				}
				for (const black of options.blacklist)
					if (typeof black === 'string') {
					}
					else if (black.test(request.url)) {
						if (options.printAborts)
							console.log(`> Aborted (blacklisted by ${black}: ${request.url}`)
						return net.abort()
					}
			}
	}

	open(url, options, fulfill, reject) {
	}

	waitUntilVisible(selectors, duration, condition, fulfill, reject) {
	}

}

export default Casper
