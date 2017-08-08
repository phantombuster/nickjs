// Build the array of testing scripts with their expected results
const fs = require("fs")
const testArray = []
fs.readdirSync(`tests/es8`).forEach((scriptName) => {
	if (require("path").extname(scriptName) === ".js") {
		testArray.push({
			scriptName: scriptName,
			expected: JSON.parse(fs.readFileSync(`./tests/${scriptName.slice(0, -3)}.json`))
		})
	}
})

const tape = require("tape")

const makeTest = (binaryName, binaryPath, esVersion, test) => {
	tape(`[${esVersion}] ${binaryName}: ${test.scriptName}`, { timeout: 10000 }, (assert) => {
		const bot = require("child_process").spawn(binaryPath, [`tests/${esVersion}/${test.scriptName}`])
		const expectedOutput = test.expected.stdout.slice()
		let buffer = ""
		bot.stdout.on("data", (data) => {
			if (expectedOutput.length > 0) {
				buffer += data
				while (true) {
					const matchPos = buffer.indexOf(expectedOutput[0])
					if (matchPos >= 0) {
						const match = expectedOutput.shift()
						assert.pass(match)
						buffer = buffer.slice(matchPos + match.length)
					} else {
						break
					}
				}
			}
		})
		bot.on("exit", (code) => {
			if (expectedOutput.length) {
				for (const missedStdout of expectedOutput) {
					assert.fail(missedStdout)
				}
				assert.comment(buffer)
			}
			assert.equal(code, 0, "exit code")
			assert.end()
		})
		process.on("exit", () => {
			try {
				bot.kill()
			} catch (e) {
			}
		})
	})
}

for (const test of [testArray[1]]) {
	makeTest("HeadlessChrome", "node", "es8", test)
	makeTest("CasperJS", "./node_modules/casperjs/bin/casperjs", "es5", test)
}
