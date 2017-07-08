const Nick = require('../src/Nick')
const Promise = require('bluebird')

const nick = new Nick({
	driver: "chrome",
	blacklist: [
		"sidecar.gitter.Im",
		],
	printAborts: true
})

nick.newTab().then(async (tab) => {

	console.log("We have a tab!")

	let [code, status, newUrl] = await tab.open('scraping-challenges.phantombuster.com')
	console.log(`>> open: ${code} ${status} ${newUrl}`)

	await tab.waitUntilVisible([
		'body > div > div.list-challenges > ul > li:nth-child(2) > a',
		'body > div > div.jumbotron > p:nth-child(4) > a'
	], 10000)

	await tab.evaluate({ a: "haha" }, (arg, done) => {
		const toto = () => { console.log('TOTO !!!') }
		console.log("from page " + arg.a)
		done(null, toto)
	})

	console.log("the homepage URL is: " + await tab.getUrl())

	await tab.click("body > div > div.list-challenges > ul > li:nth-child(2) > a")

	console.log("Clicked on challenge 1 link...")
	await tab.waitUntilVisible([
		'body > div > div.row.help.panel.panel-default > div.panel-body > div:nth-child(8) > a',
		'body > div > div.row.help.panel.panel-default > div.panel-body > div.help-code > a:nth-child(11)'
	], "or", 10000)

	console.log("the challenge 1 URL is: " + await tab.getUrl())

	await Promise.delay(3000)

	await tab.inject("https://code.jquery.com/jquery-3.2.1.min.js")
	console.log("jquery is injected")

	const pageContent = await tab.getContent()
	//console.log("Got the page content: " + pageContent)
	console.log("The page content has " + pageContent.length + " bytes")
	//require("fs").writeFileSync("page.html", pageContent)

	await tab.evaluate((arg, done) => {
		console.log(typeof jQuery)
		console.log($(".help-title"))
		console.log(jQuery(".help-title").length)
		console.log("Calling done() from evaluate() in 1s...")
		setTimeout(() => done(), 1000)
	})

	const filename = await tab.screenshot("test.png")
	console.log("Screenshot " + filename + " saved")

	console.log("Waiting 5s...")
	await Promise.delay(5000)

}).then(() => {

	nick.exit()

}).catch((err) => {

	console.log(err)
	console.log(`Oops, an error occurred: ${err}`)
	nick.exit(1)

})
