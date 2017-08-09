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
		let nbMatches = 0
		let lastMatchPos = 0
		let output = ""
		bot.stdout.on("data", (data) => {
			output += data
			if (expectedOutput.length > 0) {
				while (true) {
					const searchSpace = output.substr(lastMatchPos)
					const matchPos = searchSpace.indexOf(expectedOutput[0])
					if (matchPos >= 0) {
						const match = expectedOutput.shift()
						assert.pass(match)
						++nbMatches
						lastMatchPos += matchPos + match.length
					} else {
						break
					}
				}
			}
		})
		bot.on("exit", (code) => {
			if (expectedOutput.length) {
				let isFirstMiss = true
				for (const missedOutput of expectedOutput) {
					if (isFirstMiss) {
						assert.equal(null, missedOutput, "not found in bot stdout")
					} else {
						assert.skip(missedOutput)
					}
					isFirstMiss = false
				}
				if (output.length) {
					if (nbMatches > 0) {
						assert.comment(output.substr(0, lastMatchPos) + `\n^^^^^^ ${nbMatches} test${nbMatches > 1 ? 's' : ''} passed above this line ^^^^^^\n` + output.substr(lastMatchPos))
					} else {
						assert.comment(output)
					}
				} else {
					assert.comment("Child process did not write to stdout")
				}
			}
			assert.equal(code, 0, "exit code")
			for (const file of test.expected.files) {
				try {
					const stat = fs.statSync(file.name)
					assert.pass(`file ${file.name} is present`)
					if (file.minSize) {
						if (stat.size >= file.minSize) {
							assert.pass(`file ${file.name} has a size of ${stat.size} which is >= ${file.minSize}`)
						} else {
							assert.fail(`file ${file.name} has a size of ${stat.size} which is < ${file.minSize}`)
						}
					}
				} catch (e) {
					assert.fail(e.toString())
				}
			}
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

for (const test of testArray) {
	makeTest("HeadlessChrome", "node", "es8", test)
	makeTest("CasperJS", "./node_modules/casperjs/bin/casperjs", "es5", test)
}
