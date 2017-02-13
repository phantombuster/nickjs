import Nick from './Nick'

const nick = new Nick({
	blacklist: ['']
})

async function test() {
	tab = await nick.newTab()
}

test()
