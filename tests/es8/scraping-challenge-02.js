const Nick = require("../../lib/Nick")
const nick = new Nick()

const baseUrl = "http://scraping-challenges.phantombuster.com/pagination?page="

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
const scrapePage = async (url) => {
	const tab = await nick.newTab()
	await tab.open(url)
	await tab.waitUntilVisible(".panel-body")
	await tab.inject("tests/assets/jquery-3.2.1.min.js")
	const data = await tab.evaluate(scrape)
	await tab.close()
	return data
}
const scrapeAllPages = async () => {
	let res = []
	for (let i = 0; i < 3; i++) {
		res = res.concat(await scrapePage(baseUrl+i))
		testLog(`Page number ${i+1} scraped`)
	}
	testLog("All pages scraped")
	testLog(`First result: ${res[0].name}`)
	testLog(`Number of results: ${res.length}`)
}

scrapeAllPages()
.then(() => {
	nick.exit(0)
})
.catch((err) => {
	console.log(err)
	nick.exit(1)
})
