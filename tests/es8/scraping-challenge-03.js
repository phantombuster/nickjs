const Nick = require("../../lib/Nick")
const nick = new Nick({
	userAgent: "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36"
})

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

nick.newTab().then((tab) => {
	testLog("Tab created")
	testLog(`User-Agent is: ${nick.options.userAgent}`)
	tab.open("http://scraping-challenges.phantombuster.com/useragent")
	.then(() => {
		testLog("Page opened")
		return tab.waitUntilVisible(".panel-body")
	})
	.then(() => {
		testLog("Page loaded")
		return tab.inject("http://code.jquery.com/jquery-3.2.1.slim.min.js")
	})
	.then(() => {
		testLog("Inject distant file done")
		return tab.screenshot("tests/download/scraping-challenge-03.jpg", { fullPage: false })
	})
	.then(() => {
		testLog("Screenshot done")
		return tab.evaluate(scrape)
	})
	.then((result) => {
		testLog("Evaluate done")
		testLog(`Tenth result: ${result[9].name}`)
		testLog(`Number of results: ${result.length}`)
		nick.exit()
	})
})
.catch((err) => {
	console.log(err)
	nick.exit(1)
})
