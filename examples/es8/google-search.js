import Nick from '../Nick'

const nick = new Nick()

nick.newTab().then((tab) => {
	tab.open('google.com')
	.then(() => tab.waitUntilVisible(['input[name="q"]', 'form[name="f"]']))
	.then(() => tab.fill('form[name="f"]', { q: 'this is just a test' }))
	.then(() => tab.sendKeys('form[name="f"]', tab.driver.casper.page.event.key.Enter))
	.then(() => tab.waitUntilVisible('#fbar'))
	.then(() => {
		console.log('Saving screenshot as google.png...')
		return tab.screenshot('google.png')
	})
})
.then(() => nick.exit())
.catch((err) => {
	console.log('Oops, an error occurred: ' + err)
	nick.exit(1)
})
