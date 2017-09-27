require("babel-polyfill")
const Nick = require('../../lib/Nick')
const Promise = require('bluebird')

const nick = new Nick({
	blacklist: [
		"sidecar.gitter.Im",
		/^.*\.woff$/
		],
	//printAborts: true
	debug: true,
	extraDebug: true
})

nick.newTab().then(async (tab) => {

	console.log("We have a tab!")

	let [code, status, newUrl] = await tab.open('scraping-challenges.phantombuster.com/ch4')
	console.log(`>> open: ${code} ${status} ${newUrl}`)

	try {
		var matchedSelector = await tab.waitUntilVisible([
			'#email',
			'body > div > div'
		], 30000, "or")
	} catch (e) {
		const filename = await tab.screenshot("error.png")
		console.log("Screenshot " + filename + " saved")
		console.log(await tab.getContent())
		throw e
	}

	console.log("selector that matched: " + matchedSelector)

	await tab.evaluate({ a: "haha" }, (arg, done) => {
		const toto = () => { console.log('TOTO !!!') }
		console.log("from page " + arg.a)
		done(null, toto)
	})

	console.log("the page URL is: " + await tab.getUrl())

	await tab.sendKeys("#email", "totokjsd")

	console.log("Waiting 1s...")
	await Promise.delay(1000)

	let filename = await tab.screenshot("test1.png")
	console.log("Screenshot " + filename + " saved")

	await tab.fill("form", {
		"email": "john@doe.com",
		"password": "johnjohn"
	}, { submit: true })

	await tab.untilVisible("div.name.property-value")

	filename = await tab.screenshot("test2.png")
	console.log("Screenshot " + filename + " saved")

	//await tab.click("body > div > div.list-challenges > ul > li:nth-child(2) > a")

	//console.log("Clicked on challenge 1 link...")
	//await tab.waitUntilVisible([
	//	'body > div > div.row.help.panel.panel-default > div.panel-body > div:nth-child(8) > a',
	//	'body > div > div.row.help.panel.panel-default > div.panel-body > div.help-code > a:nth-child(11)'
	//], "or", 10000)

	//console.log("the challenge 1 URL is: " + await tab.getUrl())

	//await Promise.delay(3000)

	//await tab.inject("https://code.jquery.com/jquery-3.2.1.min.js")
	//console.log("jquery is injected")

	//const pageContent = await tab.getContent()
	////console.log("Got the page content: " + pageContent)
	//console.log("The page content has " + pageContent.length + " bytes")
	////require("fs").writeFileSync("page.html", pageContent)

	//await tab.evaluate((arg, done) => {
	//	console.log(typeof jQuery)
	//	console.log($(".help-title"))
	//	console.log(jQuery(".help-title").length)
	//	console.log("Calling done() from evaluate() in 1s...")
	//	setTimeout(() => done(), 1000)
	//})

	//const filename = await tab.screenshot("test.png")
	//console.log("Screenshot " + filename + " saved")

	//console.log("Waiting 5s...")
	//await Promise.delay(5000)

}).then(() => {

	nick.exit()

}).catch((err) => {

	//console.log(err)
	console.log(`Oops, an error occurred: ${err}`)
	nick.exit(1)

})
