const Nick = require("../../lib/Nick")
const nick = new Nick({	userAgent: "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36" })

const scrape = (arg, done) => {
	var data = []
	var persons = document.querySelectorAll("div.person > div.panel-body")
	for (var i = 0; i < persons.length; i++) {
		data.push({
			name: persons[i].querySelector(".name").textContent.trim(),
			birth_year: persons[i].querySelector(".birth_year").textContent.trim()
		})
	}
	done(null, data)
}

const testLog = (text) => {
	console.log(`>> ${text}`)
}

const exitWithError = (err) => {
	if (err) {
		console.log(err)
		nick.exit(1)
	}
}

nick.newTab((err, tab) => {
	exitWithError(err)
	testLog("Tab created")
	tab.open("http://scraping-challenges.phantombuster.com/login", (err) => {
		exitWithError(err)
		testLog("Page opened")
		tab.waitUntilVisible("form", 10000, "or", (err) => {
			exitWithError(err)
			testLog("Page loaded")
			tab.fill("form", {
				email: "john@doe.com",
				password: "johnjohn"
			}, {submit: true}, (err) => {
				exitWithError(err)
				testLog("Form filled")
				tab.waitUntilVisible(".person .panel-body", 10000, "or", (err) => {
					exitWithError(err)
					testLog("Form page loaded")
					tab.evaluate(scrape, (err, result) => {
						exitWithError(err)
						testLog("Evaluate done")
						tab.screenshot("tests/download/scraping-challenge-04.jpg", (err) => {
							exitWithError(err)
							testLog("Screenshot done")
							testLog(`Tenth result: ${result[9].name}`)
							testLog(`Number of results: ${result.length}`)
							nick.exit()
						})
					})
				})
			})
		})
	})
})
