const Nick = require("../../lib/Nick")
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

	await tab.deleteAllCookies()
	let cookies = await tab.getAllCookies()
	if (Array.isArray(cookies)) {
		testLog(`got an array of cookies`)
		testLog(`we have ${cookies.length} cookies`)
	}

	await tab.open("http://scraping-challenges.phantombuster.com/cookies")

	await tab.waitUntilVisible("div.container div.jumbotron h1")
	testLog("'wrong cookies' message is visible")

	await tab.setCookie({
		name: "phantomCookie",
		value: "sample_value",
		domain: "scraping-challenges.phantombuster.com"
	})
	cookies = await tab.getAllCookies()
	if (cookies.length >= 1) {
		testLog(`we have at least one cookie`)
	}
	for (const c of cookies) {
		if (c.value === "sample_value" && c.name === "phantomCookie") {
			testLog(`found a cookie with value sample_value and name phantomCookie`)
		}
	}

	await tab.open("http://scraping-challenges.phantombuster.com/cookies")
	await tab.waitUntilVisible(".panel-body")
	testLog("Page loaded")
	await tab.inject("tests/assets/jquery-3.2.1.min.js")
	testLog("Local jQuery injected")
	const result = await tab.evaluate(scrape)
	testLog("Evaluate done")
	testLog(`Tenth result: ${result[9].name}`)
	testLog(`Result size: ${result.length}`)

	await tab.setCookie({
		name: "test-cookie-1",
		value: "test-value-1",
		domain: "google.fr"
	})
	cookies = await tab.getAllCookies()
	if (cookies.length >= 2) {
		testLog(`we have at least two cookies`)
	}
	for (const c of cookies) {
		if (c.value === "test-value-1") {
			testLog(`we found our test-cookie-1`)
		}
	}

	await tab.deleteCookie("test-cookie-1", "google.fr")
	cookies = await tab.getAllCookies()
	if (cookies.length >= 1) {
		testLog(`we have at least one cookie`)
	}
	let found = false
	for (const c of cookies) {
		if (c.name === "test-cookie-1") {
			found = true
			console.log("We have found this cookie that should have been deleted...", JSON.stringify(c, undefined, 4))
		}
	}
	if (!found) {
		testLog(`we havent found the deleted cookie`)
	}

	await tab.deleteAllCookies()
	cookies = await tab.getAllCookies()
	if (cookies.length === 0) {
		testLog(`all cookies were deleted`)
	}

	nick.exit(0)

})()
.catch((err) => {
	console.log(err)
	nick.exit(1)
})
