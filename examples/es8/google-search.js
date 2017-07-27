const Nick  = require("../../lib/Nick")

const nick = new Nick()


nick.newTab().then((tab) => {
	return tab.open('google.com')
	.then(() => tab.waitUntilVisible(['input[name="q"]', 'form[name="f"]']))
	.then(() => tab.fill('form[name="f"]', { q: 'this is just a test' }, { submit: true }))
	.then(() => tab.waitUntilVisible('div#navcnt'))
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
