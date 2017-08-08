const Nick = require("nickjs")
const nick = new Nick()

const testLog = (text) => {
	console.log(`>> ${text}`)
}

const scrape = (arg, callback) => {
	var data = []
	var titles = []
	document.querySelectorAll("tr").forEach((el, i) => {
		const add = {}
		if (i > 0) {
			el.querySelectorAll("td").forEach((el, i) => {
				add[titles[i]] = el.textContent.trim()
			})
			data.push(add)
		} else {
			el.querySelectorAll("th").forEach((el, i) => {
				titles.push(el.textContent.trim())
			})
		}
	})
	callback(null, data)
}

;(async () => {
	const tab = await nick.newTab()
	testLog("Tab created")
	await tab.open("http://demo.phantombuster.com/dynamic-table/index.php")
	testLog("Page opened")
	await tab.waitUntilVisible("form")
	testLog("Page loaded")
	await tab.fill("form", {
		"_login": "admin",
		"_password": "admin"
	})
	await tab.click(`input[name="_submit"]`)
	testLog("Button clicked")
	await tab.waitUntilVisible("table > tbody > tr > th")
	testLog("Page loaded")
	await tab.screenshot("demo-dynamic-table.png")
	testLog("Screenshot done")
	const res = await tab.evaluate(scrape)
	testLog("Evaluate done")
	if(res.length)
		testLog("Atleast one result from the table")
	nick.exit()
})()
.catch((err) => {
	console.log(err)
	nick.exit(1)
})