import Nick from './Nick'

const nick = new Nick({
	blacklist: [''],
	userAgent: 'toto'
})

nick.initialize().then(() => {
	nick.newTab().then((tab) => {
		tab.open("phantombuster.fr", (err, res) => {
			console.log("open err: " + err)
			console.log("open res: " + res)
		})
	}).catch((err) => {
		console.log("catch: " + JSON.stringify(err, undefined, 2))
		console.log("catch: " + err)
	})
})

//async function test() {
//	tab = await nick.newTab()
//}
//
//test()
