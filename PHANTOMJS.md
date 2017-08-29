# Getting started with the CasperJS+PhantomJS driver

**Step 0:** Create the project, install NickJS and its headless browser driver:

```shell
mkdir scraping-project
cd scraping-project/
npm init -y

# Install NickJS
npm install nickjs --save

# babel-polyfill is required if we want to run the example scripts
npm install babel-polyfill --save

# Install the CasperJS+PhantomJS driver
npm install phantomjs-prebuilt@2.1.14 --save
npm install casperjs@1.1.3 --save

# Make sure CasperJS finds the PhantomJS executable
# This is just to have our CasperJS+PhantomJS working. It's not related to NickJS
export PHANTOMJS_EXECUTABLE=node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs

# Note: In the following example, the way NickJS is launched will change in the future
# (when we'll have our own launcher)

# Test our NickJS project by scraping Google and taking a screenshot
./node_modules/casperjs/bin/casperjs node_modules/nickjs/examples-casper/lib/google-search-await.js
# You should now have a google.png file in your project directory
```

Now that you have NickJS and a driver installed and working, you can start coding your own scraping bot.

**Step 1:** To use Promises and the async-await capabilities of NickJS, we need to install Babel first (and why not Bluebird to have full-featured Promises):

```shell
npm install babel-polyfill --save # you should already have this one if you followed the steps above
npm install babel-cli --save
npm install babel-preset-env --save
npm install bluebird --save
```

**Step 2**: Prepare the directory structure for our project. `src/` will contain our modern JavaScript code and `lib/` the compiled, "old JS" code:

```shell
touch .babelrc
mkdir src
mkdir lib
touch src/myNewBot.js
```

**Step 3:** We'll create a Babel configuration file `.babelrc` at the root of our project. We exclude some plugins so that `evaluate()` calls work better on the pages we're going to scrape/automate.

```json
{
	"retainLines": true,
	"presets": [
		["env", {
			"exclude": [
				"es6.symbol",
				"transform-es2015-typeof-symbol"
			],
			"loose": true
		}]
	]
}
```

**Step 4:** We'll add two npm scripts to our `package.json` file to facilitate and automate JavaScript compilation:

```json
...
    "scripts": {
        "build": "babel src -d lib",
        "build:watch": "npm run build -- --watch"
    }
...
```

**Step 5:** We're ready to code our bot:

```shell
# Code the bot
$EDITOR src/myNewBot.js

# Compile it from src/ to lib/
npm run build

# Note: In the following example, the way NickJS is launched will change in the future
# (when we'll have our own launcher)

# Run it with NickJS
./node_modules/casperjs/bin/casperjs lib/myNewBot.js
```

Here is an example of a minimal, boilerplate code for starting your bot:

```javascript
require('babel-polyfill')
const Nick = require('nickjs')
const Promise = require('bluebird')

const nick = new Nick()

nick.newTab().then(async function(tab) {

    await tab.open('nickjs.org')

    // ...
    // Continue here
    // ...

})
.then(() => nick.exit())
.catch((err) => {
    console.log('Oops, an error occurred: ' + err)
    nick.exit(1)
})
```
