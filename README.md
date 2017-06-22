<p align="center">
  <a href="http://nickjs.org/">
    <img alt="NickJS" src="https://raw.githubusercontent.com/phantombuster/nickjs/master/logo.png">
  </a>
</p>

<p align="center">
  A modern headless browser library, as simple as it is powerful.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nickjs"><img alt="NPM version" src="https://img.shields.io/npm/v/nickjs.svg?style=flat-square"></a>
  <a href="https://gitter.im/phantombuster/nickjs"><img alt="Gitter room" src="https://img.shields.io/gitter/room/Phantombuster/Lobby.svg?style=flat-square"></a>
  <a href="https://twitter.com/phbuster"><img alt="Twitter follow" src="https://img.shields.io/twitter/follow/phbuster.svg?style=social&label=Follow"></a>
</p>

<p align="center">
  <a href="http://nickjs.org">NickJS.org</a> — <b><a href="https://hub.phantombuster.com/v1/reference#nick">Documentation</a></b>
</p>

* 13 methods only
* Async-await ready (it also works with callbacks)
* Built to support any driver (today PhantomJS+CasperJS; Chromium headless coming soon)

NickJS started as a very basic need to simplify our lives writing lines of PhantomJS.
<br>As we started working on [Phantombuster](https://phantombuster.com), we realised we needed a higher-level library, as simple and powerful as possible, and which would be evolutive since it was clear Chromium headless was going to be a big thing.

We hope you'll enjoy using it and to get the discussion started.

Feel free to get in touch, suggest pull requests and add your own drivers!

The 13 methods
---

```javascript
.open()
.inject()
.waitUntilVisible()
.waitWhileVisible()
.waitUntilPresent()
.waitWhilePresent()
.click()
.fill()
.evaluate()
.getUrl()
.getContent()
.sendKeys()
.screenshot()
```

<b><a href="https://hub.phantombuster.com/v1/reference#nick">Full documentation</a></b>

Google search example
---

```javascript
import 'babel-polyfill'
import Nick from 'nickjs'
const nick = new Nick()

nick.newTab().then(async function(tab) {
    await tab.open('google.com')
    await tab.waitUntilVisible(['input[name="q"]', 'form[name="f"]'])
    await tab.fill('form[name="f"]', { q: 'this is just a test' })
    await tab.sendKeys('form[name="f"]', tab.driver.casper.page.event.key.Enter)
    await tab.waitUntilVisible('#fbar')

    console.log('Saving screenshot as google.png...')
    await tab.screenshot('google.png')

    const content = await tab.getContent()
    console.log('The content has ' + content.toString().length + ' bytes')

    const url = await tab.getUrl()
    console.log('The URL is ' + url)

    console.log('Injecting jQuery...')
    await tab.inject('https://code.jquery.com/jquery-3.1.1.slim.min.js')

    console.log('Getting the title...')
    const title = await tab.evaluate((arg, done) => {
   	    done(null, jQuery('title').text())
    })
    console.log('The title is: ' + title)
})
.then(() => nick.exit())
.catch((err) => {
    console.log('Oops, an error occurred: ' + err)
    nick.exit(1)
})
```

Begin a new scraping project using the CasperJS+PhantomJS driver
---

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

**Step 3:** We'll create a Babel configuration file `.babelrc` at the root of our project. We exclude some plugins so that `evaluate()` calls work on the pages we're going to scrape/automate.

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
import 'babel-polyfill'
import Nick from 'nickjs'
import Promise from 'bluebird'

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
