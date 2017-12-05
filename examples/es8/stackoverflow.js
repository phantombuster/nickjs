const Nick = require("../../lib/Nick")
const nick = new Nick({
	headless: false,
	debug: true
})

;(async () => {

	const tab = await nick.newTab()

	await tab.open("stackoverfloW.com")
	await tab.untilVisible(".question-summary.narrow")
	const top10questionLinks = await tab.evaluate((arg, callback) => {
		const ret = []
		for (const link of Array.from(document.querySelectorAll("a.question-hyperlink")).slice(0, 10)) {
			ret.push(link.href)
		}
		callback(null, ret)
	})

	console.log(JSON.stringify(top10questionLinks, undefined, 8))

	for (const link of top10questionLinks) {
		await tab.open(link)
		await tab.untilVisible(".postcell .post-text")
		await tab.wait(5000)
	}

	nick.exit()

})()
.catch((err) => {
	console.log(`Oops, something went wrong: ${err}`)
	nick.exit(1)
})
