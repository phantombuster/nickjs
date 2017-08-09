const Nick = require("../../lib/Nick")
const nick = new Nick()

const testLog = (text) => {
	console.log(`>> ${text}`)
}

;(async () => {
	const tab = await nick.newTab()
	testLog("Tab created")
	await tab.open("https://wrong.host.badssl.com/")
	testLog("Page opened")
	await tab.waitUntilVisible("#content")
	testLog("Page loaded")
	await tab.screenshot("tests/download/badssl.jpg")
	testLog("Screenshot done")
	nick.exit()
})()
.catch((err) => {
	console.log(err)
	nick.exit(1)
})