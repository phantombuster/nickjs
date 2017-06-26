const Nick = require('../src/Nick')
const Promise = require('bluebird')

const nick = new Nick({
	driver: "chrome"
})

nick.newTab().then(async (tab) => {

	console.log("We have a tab!")

	let [code, status, newUrl] = await tab.open('scraping-challenges.phantombuster.com')
	console.log(`>> open: ${code} ${status} ${newUrl}`)

	await tab.waitUntilPresent('div', 10000)

	await tab.evaluate({ a: "haha" }, (arg, done) => {
		const toto = () => { console.log('TOTO !!!') }
		console.log("from page " + arg.a)
		done(null, toto)
	})

	console.log("the current URL is: " + await tab.getUrl())

	console.log("Waiting 5s...")
	await Promise.delay(5000)

}).then(() => {

	nick.exit()

}).catch((err) => {

	console.log(err)
	console.log(`Oops, an error occurred: ${err}`)
	nick.exit(1)

})
