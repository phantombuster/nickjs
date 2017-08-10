const tape = require("tape")
process.setMaxListeners(0) // we'll listen to process.on("exit") a lot because we're going to spawn many childs

// Build the array of testing scripts with their info
const fs = require("fs")
const testArray = []
fs.readdirSync(`tests/es8`).forEach((scriptName) => {
	if (require("path").extname(scriptName) === ".js") {
		testArray.push({
			scriptName: scriptName,
			info: JSON.parse(fs.readFileSync(`./tests/${scriptName.slice(0, -3)}.json`))
		})
	}
})

// Adds a test to the tape stack. Used per script: one for Headless Chrome, one for CasperJS
const makeTest = (binaryName, binaryPath, test, binaryOptions) => {

	tape(`${binaryName}: ${test.scriptName}`, { timeout: 30000 }, (assert) => {

		const bot = require("child_process").spawn(binaryPath, binaryOptions)
		const expectedOutput = test.info.stdout.slice() // clone the array because we need a complete one later

		let nbMatches = 0
		let lastMatchPos = 0
		let output = ""

		// Process the bot's stdout in a streaming fashion
		bot.stdout.on("data", (data) => {
			output += data
			if (expectedOutput.length > 0) {
				while (true) {
					const searchSpace = output.substr(lastMatchPos) // Only search our match in newly received output, the order of the matches is important
					const matchPos = searchSpace.indexOf(expectedOutput[0]) // Try to find a match
					if (matchPos >= 0) {
						const match = expectedOutput.shift() // Remove this match from the array
						assert.pass(match)
						++nbMatches
						lastMatchPos += matchPos + match.length // This is later used to insert a comment in the log to know where we stopped
					} else {
						break
					}
				}
			}
		})

		// The bot has finished
		bot.on("exit", (code) => {

			// If we still have unmatched strings, fail the test
			if (expectedOutput.length) {
				let isFirstMiss = true
				for (const missedOutput of expectedOutput) {
					if (isFirstMiss) {
						assert.fail(missedOutput) // Only mark the first non-match as a failure
						if (output.length) {
							// We directly log to stdout, but it's okay because we run tap-spec on top, it's going to be pretty
							if (nbMatches > 0) {
								console.log(output.substr(0, lastMatchPos) + `\n^^^^^^ ${nbMatches} test${nbMatches > 1 ? 's' : ''} passed above this line ^^^^^^\n` + output.substr(lastMatchPos))
							} else {
								console.log(output)
							}
						} else {
							console.log("Child process did not write to stdout")
						}
					} else {
						assert.skip(missedOutput) // Others are skipped for a cleaner test log
					}
					isFirstMiss = false
				}
			}

			// Make sure the bot exited with 0
			assert.equal(code, 0, "exit code is 0")

			// Verify the files
			for (const file of test.info.files) {
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
					fs.unlinkSync(file.name) // Delete the file because another script might be re-tested with it later
				} catch (e) {
					assert.fail(e.toString())
				}
			}

			// This tape test has finished
			assert.end()
		})

		// We try to prevent stray processes
		process.on("exit", () => {
			try {
				bot.kill()
			} catch (e) {
			}
		})

	})

}

for (const test of testArray) {
	makeTest("HeadlessChrome", "node", test, [`tests/es8/${test.scriptName}`])
	makeTest("CasperJS", "./node_modules/casperjs/bin/casperjs", test, ["--web-security=false", "--ignore-ssl-errors=true", `tests/es5/${test.scriptName}`])
}

tape.onFinish(() => {
	console.log(" >>>> tape on finish")
})
