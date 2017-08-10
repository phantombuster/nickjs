const Nick = require("../../lib/Nick")
const nick = new Nick()

const testLog = (text) => {
	console.log(`>> ${text}`)
}

;(async () => {
	const tab = await nick.newTab()
	await tab.open("localhost:8080/elements.html")
	await tab.waitWhileVisible("#first")
	testLog("Wait while visible done")
	await tab.waitUntilVisible("#second")
	testLog("Wait until visible done")
	await tab.waitUntilPresent("#third")
	testLog("Wait until present done")
	await tab.waitWhilePresent("#fourth")
	testLog("Wait while present done")
	try {
		await tab.waitWhileVisible("#second", 500)
	} catch (error) {
		testLog("Wait while visible fail")
	}
	try {
		await tab.waitUntilVisible("#first", 500)
	} catch (error) {
		testLog("Wait until visible fail")
	}
	try {
		await tab.waitUntilPresent("#fourth", 500)
	} catch (error) {
		testLog("Wait until present fail")
	}
	try {
		await tab.waitWhilePresent("#third", 500)
	} catch (error) {
		testLog("Wait while present fail")
	}
	nick.exit(0)
})()
.catch((err) => {
	console.log(err)
	nick.exit(1)
})