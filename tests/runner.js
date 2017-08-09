const tape = require("tape")
process.setMaxListeners(0) // we'll listen to process.on("exit") a lot because we're going to spawn many childs

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

// Adds a test to the tape stack. Used per script: one for Headless Chrome, one for CasperJS
const makeTest = (binaryName, binaryPath, esVersion, test) => {

	tape(`[${esVersion}] ${binaryName}: ${test.scriptName}`, { timeout: 30000 }, (assert) => {

		const bot = require("child_process").spawn(binaryPath, [`tests/${esVersion}/${test.scriptName}`])
		const expectedOutput = test.expected.stdout.slice() // clone the array because we need a complete one later

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
					} else {
						assert.skip(missedOutput) // Others are skipped for a cleaner test log
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

			// Make sure the bot exited with 0
			assert.equal(code, 0, "exit code")

			// Verify the files
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
	makeTest("HeadlessChrome", "node", "es8", test)
	makeTest("CasperJS", "./node_modules/casperjs/bin/casperjs", "es5", test)
}
