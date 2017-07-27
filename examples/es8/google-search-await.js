require('babel-polyfill')
const Nick = require("../../lib/Nick")
const Promise = require("bluebird")

const nick = new Nick()

console.log(JSON.stringify(nick.options, undefined, 2))

nick.newTab().then(async function(tab) {
	const openRet = await tab.open('google.com')
	console.log(JSON.stringify(openRet, undefined, 2))

	const test = await tab.evaluate((arg, done) => {
		//__utils__.echo(arg)
		done(null, [1, 2, 3])
	})
	console.log('eval result: ' + JSON.stringify(test, undefined, 2))

	await tab.waitUntilVisible(['input[name="q"]', 'form[name="f"]'])
	await tab.fill('form[name="f"]', { q: 'this is just a test' }, { submit: true })
	await tab.waitUntilVisible('div#navcnt')


	console.log('Saving screenshot as google.png...')
	await tab.screenshot('google.png')

	const content = await tab.getContent()
	console.log('The content has ' + content.toString().length + ' bytes')

	const url = await tab.getUrl()
	console.log('The URL is ' + url)

	console.log('Injecting jQuery...')
	await tab.inject('https://code.jquery.com/jquery-3.1.1.slim.min.js')
	//const test = await tab.inject('http://bit.ly/2pem27p')
	//console.log(JSON.stringify(test, undefined, 2))
	//await tab.inject('toto')
	//await Promise.delay(5000)

	console.log('Getting the title...')
	const title = await tab.evaluate((arg, done) => {
		done(null, jQuery('title').text())
	})
	console.log('The title is: ' + title)
})
.then(() => nick.exit())
.catch((err) => {
	console.log('Oops, an error occurred: ' + err)
	nick.exit(1)
})
