const Nick = require("../../lib/Nick")
const nick = new Nick()

const testLog = (text) => {
	console.log(`>> ${text}`)
}

;(async () => {
	const tab = await nick.newTab()
	testLog("Tab created")
	tab.onPrompt = (msg) => {
		testLog(`Prompt message is: ${msg}`)
		return "phantombuster"
	}
	tab.onConfirm = (msg) => {
		testLog(`Confirm message is: ${msg}`)
		return true
	}
	await tab.open("localhost:8080/alerts.html")
	testLog("Page opened")
	await tab.waitUntilVisible("#div")
	await tab.screenshot("tests/download/error.png")
	testLog("Page loaded")
	nick.exit()
})()
.catch((err) => {
	console.log(err)
	nick.exit(1)
})