const Nick = require('../src/Nick')
const Promise = require('bluebird')

const nick = new Nick({
	driver: "chrome"
})

nick.newTab().then(async (tab) => {
	console.log("We have a tab!")
	let [code, status, newUrl] = await tab.open('scraping-challenges.phantombuster.com')
	console.log(`>> open: ${code} ${status} ${newUrl}`)
	console.log("Waiting 1s...")
	await Promise.delay(1000)
	await tab.waitUntilVisible(['p'])
	console.log("Waiting 5s...")
	await Promise.delay(5000)
}).then(() => nick.exit())
.catch((err) => {
	console.log(err)
	console.log(`Oops, an error occurred: ${err}`)
	nick.exit(1)
})
