const Nick = require("../../lib/Nick")
const nick = new Nick()

const testLog = (text) => {
	console.log(`>> ${text}`)
}

const checkUrl = (url, checkbox, color, date, email, number, radio, range, text) => {
	url = decodeURIComponent(url)
	if(url.indexOf(`checkbox=${(0 + checkbox)}`) >= 0)
		testLog(`Checkbox set to ${checkbox}`)
	else
		testLog("Checkbox set to false")
	if(url.indexOf(`color=${color}` >= 0))
		testLog(`Color set to ${color}`)
	if(url.indexOf(`date=${date}`) >= 0) {
		if (date === (new Date()).toISOString().slice(0, 10))
			testLog("Date set to today's date")
		else
			testLog(`Date set to ${date}`)
	}
	if(url.indexOf(`email=${email}`) >= 0)
		testLog(`Email set to ${email}`)
	if(url.indexOf(`number=${number}`) >= 0)
		testLog(`Number set to ${number}`)
	if(url.indexOf(`radio=${(0 + radio)}`) >= 0)
		testLog(`Radio set to ${radio}`)
	else
		testLog("Radio set to false")
	if(url.indexOf(`range=${range}`) >= 0)
		testLog(`Range set to ${range}`)
	if(url.indexOf(`text=${text.replace(/\s/g, "+")}`) >= 0)
		testLog(`Text set to ${text}`)
}

const testFill = async (tab, checkbox, color, date, email, number, radio, range, text, submit, file) => {
	await tab.fill("form", {
		"checkbox": checkbox,
		"color": color,
		"date": date,
		"email": email,
		"number": number,
		"radio": radio,
		"range": range,
		"text": text
	}, {submit: true})
	testLog("Form filled")
	await tab.wait(1000)
	testLog("Wait done")
	checkUrl(await tab.getUrl(), checkbox, color, date, email, number, radio, range, text)
}

;(async () => {
	const tab = await nick.newTab()
	await tab.open("localhost:8080/form.html")
	testLog("Page opened")
	await tab.waitUntilVisible("form")
	testLog("Page loaded")
	const content = await tab.getContent()
	if (content.indexOf("<!-- HTML COMMENTS -->") >= 0)
		testLog("Get content done")
	var date = new Date();
	var old = new Date("2000-01-01");
	var currentDate = date.toISOString().slice(0,10)
	var oldDate = old.toISOString().slice(0, 10)
	await testFill(tab, true, "#35C2DB", currentDate, "test@phantombuster.com", 20, true, 1, "NickJS test")
	await testFill(tab, false, "#35C2CB", oldDate, "tst@phantombuster.com", 10, false, 10, "NickJS2 test")
	nick.exit()
})()
.catch((err) => {
	console.log(err)
	nick.exit(1)
})
