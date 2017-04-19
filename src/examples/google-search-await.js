import Nick from '../Nick'
import Promise from 'bluebird'

const nick = new Nick()

console.log(JSON.stringify(nick.options, undefined, 2))

nick.newTab().then(async function(tab) {
	await tab.open('google.com')
	await tab.waitUntilVisible(['input[name="q"]', 'form[name="f"]'])
	await tab.fill('form[name="f"]', { q: 'this is just a test' })
	await tab.sendKeys('form[name="f"]', tab.driver.casper.page.event.key.Enter)
	await tab.waitUntilVisible('#fbar')

	console.log('Saving screenshot as google.png...')
	await tab.screenshot('google.png')

	const content = await tab.getContent()
	console.log('The content has ' + content.toString().length + ' bytes')

	const url = await tab.getUrl()
	console.log('The URL is ' + url)

	console.log('Injecting jQuery...')
	//await tab.inject('https://code.jquery.com/jquery-3.1.1.slim.min.js')
	const test = await tab.inject('http://bit.ly/2pem27p')
	console.log(JSON.stringify(test, undefined, 2))
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
