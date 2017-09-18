const Nick = require("../../lib/Nick")
const nick = new Nick({loadImages: false})

const scrollToBottom = (arg, callback) => {
	window.scrollTo(0,document.body.scrollHeight)
	callback()
}

const testLog = (text) => {
	console.log(`>> ${text}`)
}

const scroll = async (tab, previousCount) => {
	await tab.evaluate(scrollToBottom)
	try {
		await tab.waitUntilVisible(`article div.section-content > ul li:nth-child(${previousCount + 1})`)
		return (await tab.evaluate((arg, done) => { done(null, document.querySelectorAll("article div.section-content > ul li").length) }))
	} catch (error) {
		console.log("No new startup to load.")
		return null
	}
}

const infiniteScroll = async (tab, previousCount = 0) => {
	const newCount = await scroll(tab, previousCount)
	if (newCount && newCount <= 100) {
		console.log(`${newCount} elements loaded.`)
		await infiniteScroll(tab, newCount)
	}
}

nick.newTab().then(async (tab) => {
	testLog("Tab created")
	await tab.open("https://websummit.com/featured-startups")
	testLog("Page opened")
	await tab.waitUntilVisible("#speaker_attendee_list_panel")
	testLog("Page loaded")
	await infiniteScroll(tab)
	testLog("Scroll done")
	const scrape = (arg, done) => {
		const ret = jQuery(".item").map(function() {
			return {
				name: jQuery(this).find("h3").text().trim(),
				desc: jQuery(this).find("p:nth-child(3)").text().trim(),
				link: jQuery(this).find("a").attr("href"),
				imgUrl: jQuery(this).find("div.item-image img").attr("src")
			}
		})
		done(null, jQuery.makeArray(ret))
	}
	testLog("Scrape done")
	const startupList = await tab.evaluate(scrape)
	testLog(`Tenth startup: ${startupList[9].name}`)
	if (startupList.length >= 10)
		testLog("Atleast 10 startups")
	nick.exit()
})
.catch((err) => {
	console.log(err)
	nick.exit(1)
})
