const Nick = require("../../lib/Nick")
const nick = new Nick()

const Promise = require("bluebird")

const testLog = (text) => {
	console.log(`>> ${text}`)
}

const scrape = (arg, callback) => {
	if (window.NodeList && !NodeList.prototype.forEach) {
		NodeList.prototype.forEach = function (callback, thisArg) {
			thisArg = thisArg || window;
			for (var i = 0; i < this.length; i++) {
				callback.call(thisArg, this[i], i, this);
			}
		};
	}
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
	await Promise.delay(100) // wait so that the string below is guaranteed to be logged after the "form submitted" navigation log
	testLog("Button clicked")
	await tab.waitUntilVisible("table > tbody > tr > th")
	testLog("Page loaded")
	await tab.wait(1000) // :(
	await tab.screenshot("tests/download/demo-dynamic-table.png")
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
