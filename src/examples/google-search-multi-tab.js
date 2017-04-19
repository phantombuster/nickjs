import Nick from '../Nick'
import Promise from 'bluebird'

const nick = new Nick()

const tab1Promise = nick.newTab().then(async function(tab) {
	console.log('TAB 1: Opening Google')
	await tab.open('google.com')

	console.log('TAB 1: Waiting for the form')
	await tab.waitUntilVisible(['input[name="q"]', 'form[name="f"]'])

	console.log('TAB 1: Filling the form')
	await tab.fill('form[name="f"]', { q: 'this is just a test' })
	await tab.sendKeys('form[name="f"]', tab.driver.casper.page.event.key.Enter)

	console.log('TAB 1: Waiting for the results')
	await tab.waitUntilVisible('#fbar')

	console.log('TAB 1: Getting the title')
	try {
		await tab.inject('https://code.jquery.com/jquery-3.1.1.slim.min.js')
	} catch(e) {
		console.log('TAB 1 inject exception: ' + e)
	}
	const title = await tab.evaluate((arg, done) => {
		done(null, jQuery('title').text())
	})
	console.log('TAB 1: The title is: ' + title)

	console.log('TAB 1: Closing')
	await tab.close()
})
.catch((err) => {
	console.log('An error occurred in TAB 1: ' + err)
})

const tab2Promise = nick.newTab().then(async function(tab) {
	console.log('TAB 2: Opening Google')
	await tab.open('google.fr')

	console.log('TAB 2: Waiting for the form')
	await tab.waitUntilVisible(['input[name="q"]', 'form[name="f"]'])

	console.log('TAB 2: Filling the form')
	await tab.fill('form[name="f"]', { q: 'phantombuster' })
	await tab.sendKeys('form[name="f"]', tab.driver.casper.page.event.key.Enter)

	console.log('TAB 2: Waiting for the results')
	await tab.waitUntilVisible('#fbar')

	console.log('TAB 2: Waiting 5s')
	await Promise.delay(5000)
	//tab.driver.casper.page.clearMemoryCache()
	console.log('TAB 2: Getting the title')
	try {
		//await tab.inject('https://code.jquery.com/jquery-3.2.1.min.js')
		await tab.inject('https://code.jquery.com/jquery-3.1.1.min.js')
	} catch(e) {
		console.log('TAB 2 inject exception: ' + e)
	}
	const title = await tab.evaluate((arg, done) => {
		done(null, jQuery('title').text())
	})
	console.log('TAB 2: The title is: ' + title)

	console.log('TAB 2: Closing')
	await tab.close()
})
.catch((err) => {
	console.log('An error occurred in TAB 2: ' + err)
})

Promise.all([tab1Promise, tab2Promise]).then(() => {
	console.log('All tabs have finished')
	nick.exit()
})
