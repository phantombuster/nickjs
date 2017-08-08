const Nick = require("../../../lib/Nick")
const nick = new Nick()

const testLog = (text) => {
	console.log(`>> ${text}`)
}

const scrape = (arg, done) => {
	var data = $("div.person > div.panel-body").map(function () {
		return({
			name: $(this).find(".name").text().trim(),
			birth_year: $(this).find(".birth_year").text().trim()
		})
	})
	done(null, $.makeArray(data))
}

;(async () => {
	const tab = await nick.newTab()
	testLog("Tab created")
	await tab.open("http://scraping-challenges.phantombuster.com/onepage")
	testLog("Page opened")
	await tab.waitUntilVisible(".panel-body")
	testLog("Page loaded")
	await tab.inject("tests/scripts/assets/jquery-3.2.1.min.js")
	testLog("Local jQuery injected")
	const result = await tab.evaluate(scrape)
	testLog("Evaluate done")
	await tab.screenshot("scrapping-challenge-01.jpg")
	testLog("Screenshot done")
	testLog(`Tenth result: ${result[9].name}`)
	testLog(`Result size: ${result.length}`)
	nick.exit(0)
})()
.catch((err) => {
	console.log(err)
	nick.exit(1)
})
