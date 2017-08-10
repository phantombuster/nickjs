const Nick = require("../../lib/Nick")
const nick = new Nick()

const testLog = (text) => {
	console.log(`>> ${text}`)
}

const statusToCheck = [
	"200",
	"204", // No Content not working on chrome
	"205", // Reset Content not working on chrome
	"300",
	"301",
	"302",
	"303",
	"304", // Not Modified not working on chrome
	"305",
	"306",
	"307",
	"400",
	"401",
	"402",
	"403",
	"404",
	"405",
	"407", // Proxy Authentication Required not working on chrome
	"408",
	"413",
	"414",
	"418",
	"429",
	"500",
	"502",
	"503",
	"504",
]

const baseUrl = "httpstat.us/"

const checkStatus = async (tab, status) => {
	const [ code, message ] = await tab.open(baseUrl+status)
	testLog(`Code: ${code}, Message: ${message} for ${baseUrl+status}`)
}

;(async () => {
	const tab = await nick.newTab()
	for (const status of statusToCheck) {
		await checkStatus(tab, status)
	}
	nick.exit()
})()
.catch((err) => {
	console.log(err)
	nick.exit(1)
})