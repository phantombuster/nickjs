const Nick = require('../src/Nick')
const Promise = require('bluebird')

const nick = new Nick({
	driver: "chrome"
})

nick.newTab().then(async (tab) => {
	console.log("We have a tab!")
	await tab.open('google.fr')
	await Promise.delay(5000)
}).then(() => nick.exit())
.catch((err) => {
	console.log(err)
	console.log(`Oops, an error occurred: ${err}`)
	nick.exit(1)
})
