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
  <a href="http://nickjs.org">NickJS.org</a> — <a href="https://github.com/phantombuster/nickjs#table-of-content">Inline doc ↓</a> — <b><a href="https://hub.phantombuster.com/v1/reference#nick">Hosted doc</a></b>
</p>

* Simple high-level API
* Async-await ready (also supports callbacks)
* Built to support any driver (today PhantomJS+CasperJS; Chrome headless coming soon)

NickJS started as a very basic need to simplify our lives writing lines of PhantomJS.
<br>As we started working on [Phantombuster](https://phantombuster.com), we realised we needed a higher-level library, as simple and powerful as possible, and which would be evolutive since it was clear Chrome headless was going to be a big thing.

We hope you'll enjoy using it and to get the discussion started.

Feel free to get in touch, suggest pull requests and add your own drivers!

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

# Table of content

+ [Nick](#nick)
  + [Nick()](#nickoptions)
  + [driver](#driver)
  + [exit()](#exitcode)
  + [newTab()](#newtab)
+ [Nick tab](#nick-tab)
  + [click()](#clickselector-callback)
  + [close()](#closecallback)
  + [evaluate()](#evaluateinpagefunction--argumentobject-callback)
  + [fill()](#fillselector-inputs--submit-callback)
  + [getContent()](#getcontentcallback)
  + [getUrl()](#geturlcallback)
  + [inject()](#injecturlorpath--callback)
  + [open()](#openurl--options-callback)
  + [screenshot()](#screenshotfilename--callback)
  + [sendKeys()](#sendkeysselector-keys-options-callback)
  + [waitUntilVisible()](#waituntilvisibleselectors--timeout--condition-callback)


# Documentation


# Nick


# Nick([options])
**This is Nick's constructor. `options` is an optional argument that lets you configure your Nick instance.** 



Nick must be instantiated only once. Behind the scenes, the headless browser driver is initialized. The next step is to open a tab with [newTab()](#nick-newtab).

### — [options] `(PlainObject)`

Optional settings for the Nick instance.
* **`printNavigation (Boolean)`**: when `true` (the default), Nick will log important navigation information like page changes, redirections and form submissions
* **`printResourceErrors (Boolean)`**: when `true` (the default), Nick will log all the errors encountered when loading pages, images and all other resources needed by the pages you visit
* **`printPageErrors (Boolean)`**: when `true` (the default), Nick will log all JavaScript errors and exceptions coming from the scripts executed in the page context
* **`resourceTimeout (Number)`**: milliseconds after which Nick will abort loading a resource (page, images and all other resources needed by the pages you visit)
* **`userAgent (String)`**: sets the `User-Agent` header
* **`loadImages (Boolean)`**: whether or not to load the images embedded in the pages (defaults to `true`) (note: specifying this parameter overrides the agent's Phantombuster setting "Load Images")
* **`blacklist (Array)`**: soon!
* **`whitelist (Array)`**: soon!
##### Basic (ES6+)
```javascript
import Nick from 'nickjs'
const nick = new Nick()
```

##### All options (ES6+)
```javascript
import Nick from 'nickjs'

// these are the default options
const nick = new Nick({
  printNavigation: true,
  printResourceErrors: true,
  printPageErrors: true,
  resourceTimeout: 10000,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36"
})
```

# driver
`nick.driver` lets you access the underlying headless browser driver instance that is being used by Nick.

This is useful when doing trickier things in your navigation and for accessing driver-specific methods that are not available in Nick.

##### PhantomJS+CasperJS driver
```javascript
// In this case we're using the PhantomJS+CasperJS driver
// This gets the CasperJS instance and clears the cache
nick.driver.casper.page.clearMemoryCache()
```

# exit([code])
**Immediately stops the whole bot and exits the process with `code`.**

### — [code] `(Number)`

Optional exit code that the process should return. `0` by default.



##### Example 1
```javascript
nick.exit() // All is well
```

##### Example 2
```javascript
nick.exit(1) // Something went horribly wrong
```

# newTab()
**Opens a new tab.**

This is the first step in manipulating a website.

To open multiple tabs, call this method multiple times. If your bot opens many tabs to do different tasks, it's a good idea to [close()](#nick-close) them when their work is finished (to keep memory usage down).

##### Example
```javascript
try {
  const tab = await nick.newTab()
  // You can now browse any website using `tab`
} catch (err) {
  console.log("An error occured:", err)
  nick.exit(1)
}
```

# Nick-tab


# click(selector[, callback])
**Performs a click on the element matching the CSS selector `selector`.**

Clicking on elements is one of the main ways to manipulate web pages with Nick. Clicking is an easy way to navigate where you want, but keep in mind that it can be more efficient to scrape URLs (for example with [`evaluate()`](#nick-evaluate)) and then call [`open()`](#nick-open).

### — selector `(String)`

CSS selector targeting what element to click.
Probably a `button` or a `a` but can be anything you want.
Make sure the target element is visible or present by calling [`waitUntilVisible()`](#nick-waituntilvisible) or [`waitUntilPresent()`](#nick-waituntilpresent) beforehand.

### — callback `(Function(err))`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a string describing what went wrong with the click (typically the CSS selector did no match any element)



##### Example
```javascript
const selector = "button.cool-button"
const pageTimeout = 5000

try {
  await tab.waitUntilPresent(selector, pageTimeout)
  await tab.click(selector)
} catch (err) {
  console.log("An error occured:", err)
  nick.exit(1)
}
// Continue your navigation in this branch
// You should probably do a waitUntilVisible() or waitUntilPresent() here
```

##### :warning: Make sure your target is here
> Before calling `click()` you should make sure the element you are trying to click on is actually visible or present in the page by using [`waitUntilVisible()`](#nick-waituntilvisible) or [`waitUntilPresent()`](#nick-waituntilpresent).

# close([callback])
**Closes the `tab` in current use.**

After `close()` is called, the tab becomes unusable.
All subsequent method calls will throw an exception saying that this specific tab instance has stopped.
Lose all references to the instance for it to be garbage-collected and clean cookies and cache used for the whole nick.


### — callback `(Function)`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a string describing what went wrong with the click (typically the CSS selector did no match any element)







##### Example
```javascript
try {
  await tab.close()
  // tab can not be used here anymore 
  // but you may continue other actions
} catch (err) {
  console.log("Could not close tab: " + err)
  nick.exit(1)
}
```

##### :information_source: It's like closing a tab in your browser
> This method is useful when using multiple Nick instances to simulate browsing on multiple tabs. Calling `close()` is the equivalent of closing a tab.

##### :information_source: Tips
> It can be also useful if you want to iterate on many URLs, the fact that close() clear cache and cookies free a lot of memory.

##### :no_entry_sign: Warning
> Calling `close()` will clear the cookies and cache of the **whole `nick`** instantiated before.

# evaluate(inPageFunction [, argumentObject, callback])
**Execute `inPageFunction` in the current page context.**

Nick provides you with **two separate JavaScript contexts**:
1. **Where the Nick code runs**: this is your script environment, with all your locally declared variables and all your calls to Nick methods
2. **Where the page code runs**: this is where the page executes jQuery or AngularJS code for example

The `evaluate()` method allows you to declare a function in your Nick context (1) and execute it in the page context (2). **It's like executing code in your browser's inspector tool**: you can do anything you want with the page.

In the page context, you have access to all the global variables declared by the page, as well as the DOM (`window`, `document`, ...). Any JavaScript libraries included by the page can also be used.

If the page does not include what you want (jQuery or underscore for example), you can inject any JavaScript file with [`inject()`](#nick-inject) before calling `evaluate()`.

### — inPageFunction `(Function(argumentObject, callback))`

Function to execute in the current page context. `argumentObject` will be passed as its first argument and a `callback` as it second argument.
`argumentObject` is an empty plainObject by default.
`callback` is the function to call when finished.
* **`err (String)`**: `null` if the function succeed otherwise put a description of what went wrong
* **`res (Any)`**: return value of `inPageFunction` in case of success (this value is serialized to be transferred back to the Nick context — complex object like DOM elements, functions or jQuery objects cannot be returned to the Nick context reliably)

### — [argumentObject] `(PlainObject)`

Optional object that will be passed in argument of `inPageFunction`.
This object is serialized to be transferred to the page context — complex objects like functions or JavaScript modules cannot be passed as argument reliably.

### — callback `(Function(err, res)`

Function called when finished.
* **`err (String)`**: `null` or a string describing what went wrong during the evaluation of `inPageFunction`
* **`res (Any)`**: return value of `inPageFunction` in case of success (this value is serialized to be transferred back to the Nick context — complex object like DOM elements, functions or jQuery objects cannot be returned to the Nick context reliably)







##### Example
```javascript
const scraper = (arg, done) => {
  // In this case, the current page uses a typical jQuery declared as $
  done(null, $(arg.link).attr("href"))
}
const arg = { link: "#header > a.title" }

try {
  const res = await tab.evaluate(scraper, arg)
  console.log("Scraped this link: " + res)
  // Continue your navigation here
} catch (err) {
  console.log("Something went wrong: " + err)
  nick.exit(1)
}
```

##### :no_entry_sign: Local variables not accessible
> Because `inPageFunction` is executed in the current page context, your local variables that have been declared before your `evaluate()` call will **not** be accessible. You can however transfer variables using the `argumentObject` parameter.

**For this reason, Nick methods won't be available inside evaluate.**

##### :no_entry_sign: Error in callback
> When returning data with the callback in the `inPageFunction` take care to always set the first argument as `null` if there is no error.

##### :warning: Serialization subtleties
> Keep in mind that to transfer `inPageFunction` and its return value to and from the page context, serialization has to occur. Everything becomes a string at some point. **So you cannot return DOM elements or jQuery objects from the page.** Moreover, the underlying PhantomJS browser has [a bug](https://github.com/ariya/phantomjs/issues/11268) where serialization of `null` gives an empty string `""` (even in nested objects and arrays). Beware!

# fill(selector, inputs [, submit, callback])
**Fills a form with the given values and optionally submits it.**

 Inputs are referenced by their name attribute.

### — selector `(String)`

CSS selector targeting what form to fill. It should point to a `form` tag. Make sure the target form is visible or present by calling [`waitUntilVisible()`](#nick-waituntilvisible) or [`waitUntilPresent()`](#nick-waituntilpresent) beforehand.

### — inputs `(PlainObject)`

An object containing the data you want to enter in the form. **Keys must correspond to the inputs' `name` attribute.** This method supports single `select` fields in the same way as normal `input` fields. For `select` fields allowing multiple selections, supply an array of values to match against.

### — options `(Boolean)`

* **`submit (Boolean)`**: Whether or not to submit the form after filling it (`false` by default).

### — callback `(Function(err))`

Function called when finished.
* **`err (String)`**: `null` or a string describing what went wrong when filling the form



##### Example
```javascript
const selector = "#contact-form"
const inputs = {
  "subject": "I am watching you",
  "content": "So be careful.",
  "civility": "Mr",
  "name": "Chuck Norris",
  "email": "chuck@norris.com",
  "cc": true,
  "attachment": "roundhousekick.doc" // file taken from your agent's disk
}

try {
  await tab.waitUntilVisible(selector, 5000)
  await tab.fill(selector, inputs, { submit: true })
  console.log("Form sent!")
  // Continue your navigation in this branch
  // You should probably do a waitUntilVisible() or waitUntilPresent() here
} catch (err) {
  console.log("Form not found:", err)
  nick.exit(1)
}


```

##### Form used in the example (HTML)
```html
<form action="/contact" id="contact-form" enctype="multipart/form-data">
  <input type="text" name="subject"/>
  <textearea name="content"></textearea>
  <input type="radio" name="civility" value="Mr"/> Mr
  <input type="radio" name="civility" value="Mrs"/> Mrs
  <input type="text" name="name"/>
  <input type="email" name="email"/>
  <input type="file" name="attachment"/>
  <input type="checkbox" name="cc"/> Receive a copy
  <input type="submit"/>
</form>
```

# getContent([callback])
**Returns the current page content as a string.**

### — callback `(Function(err))`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a string describing what went wrong when filling the form.
* **`content (String)`**: the full HTML content of the current webpage.




##### Example
```javascript
try {
  const content = await tab.getContent()
  // content contains the content of the current webpage
} catch (err) {
  console.log("Could not get the content of the page:", err)
  nick.exit(1)
}
```

##### :warning: Note
> When the current page is a dynamic JavaScript powered HTML page, `getContent()` will return a snapshot of the current state of the DOM and not the initial source code.

# getUrl([callback])
**Returns the current page URL as a string.**

### — callback `(Function(err))`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a string describing what went wrong when filling the form.
* **`url (String)`**: the full `URL` of the current page.



##### Example
```javascript
try {
  const url = await tab.getUrl()
  console.log("The url of the page is", url)
  // You can use the variable url and continue your actions
} catch (err) {
  console.log("Could not get the current url:", err)
  nick.exit(1)
}
```

##### :information_source: Note
> The URL you get will be URL-decoded.

# inject(urlOrPath [, callback])
**Inject a script in the current DOM page context.**

The script can be stored locally on disk or on a remote server.

### — urlOrPath `(String)`

Path to a local or remote script.

### — callback `(Function(err))`

Function called when finished (optional).
* **`err (String)`**: `null` or a string describing what went wrong

##### Example
```javascript
const urlOrPath = "https://code.jquery.com/jquery-3.2.1.min.js"

try {
  await tab.inject(urlOrPath)
  console.log("Jquery script inserted!")
  //You may now use tab.evaluate() and use jQuery functions
} catch (err) {
  console.log("Could not inject jQuery:", err)
  nick.exit(1)
}
```

# open(url [, options, callback])
**Opens the webpage at `url`.** 

By default, it's a `GET` but you can forge any type of HTTP request using the `options` parameter.

Opening a page will time out after 10 seconds. This can be changed with the `resourceTimeout` Nick option (see [Nick's options](#nick)). Note: this time out concerns the initial page but not the resources the page requires thereafter.

### — url `(String)`

URL of the page to open. Should begin with `http://` or `https://` (or `file://` to open a page that was previously downloaded to your agent's disk).

### — [options] `(PlainObject)`

Optional request configuration (*optional*).

### — callback `(Function(err, httpCode, httpStatus, url))`

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong (typically if there was a network error or timeout)
* **`httpCode (Number)`**: the received HTTP code or `null` if there was a network error
* **`httpStatus (String)`**: text equivalent of the received HTTP code or `null` if there was a network error
* **`url (String)`**: the actually opened URL (can be different from the input URL because of 3xx redirects for example) or `null` if there was a network error



##### Example
```javascript
const url = "https://phantombuster.com/"

try {
  const [httpCode, httpStatus] = await tab.open(url)
  
  if ((httpCode >= 300) || (httpCode < 200)) {
    console.log("The site responded with " + httpCode + " " + httpStatus)
    nick.exit(1)
  } else {
    console.log("Successfully opened " + url + ": " + httpCode + " " + httpStatus)
    // Manipulate the page in this branch
    // You should probably do a waitUntilVisible() or waitUntilPresent() here
  }
} catch(err) {
  console.log("Could not open page: " + err)
  nick.exit(1)
}

```

##### JavaScript: sample options
```javascript
{
  method: "post",
  data:   {
    "some param": "some data",
    "another field":  "this is sent in x-www-form-urlencoded format"
  },
  headers: {
    "Accept-Language": "fr,fr-fr;q=0.8,en-us;q=0.5,en;q=0.3"
  }
}
```

##### :no_entry_sign: Know your errors
> This method will NOT return an error when the received HTTP isn't 200. An error is returned only when a network error happens. It's your job to check for 404s or 500s with `httpCode` if needed.

##### :warning: Always wait for DOM elements
> Many pages on the web load slowly and unreliably. Many more make numerous aynchronous queries. For these reasons, you should always wait for the DOM elements that interest you after opening a page with [`waitUntilVisible()`](#nick-waitUntilVisible)or [`waitUntilPresent()`](#nick-waituntilpresent).

# screenshot(filename [, callback])
**Take a screenshot of the current page.**

### — path `(String)`

The local path of the screenshot.
The format is defined by the file extension. 'image.jpg' will create a JPEG image in the current folder.

### — callback `(Function(err))`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a string describing what went wrong when filling the form

##### Example
```javascript
const path = "./image.jpg"

try {
  await tab.screenshot(path)
  console.log("Screenshot saved at", path)
  // Your screenshot is available at this path
} catch (err) {
  console.log("Could not take a screenshot:", err)
  nick.exit(1)
}
```

# sendKeys(selector, keys[, options, callback])
**Write `keys` in an `<input>`, `<textarea>` or any DOM element with `contenteditable="true"` in the current page.**

### — selector `(String)`

A CSS3 or XPath expression that describes the path to DOM elements.

### — keys `(String)`

Keys to send to the editable DOM element.

### — options `(String)`

The three options available are:

* `reset (Boolean)`: remove the content of the targeted element before sending key presses.
* `keepFocus (Boolean)`: keep the focus in the editable DOM element after keys have been sent (useful for input with dropdowns).
* `modifiers (PlainObject)`: modifier string concatenated with a + (available modifiers are ctrl, alt, shift, meta and keypad).

### — callback `(Function(err))`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a string describing what went wrong when filling the form

##### Example
```javascript
const selector = '#message'
const keys = "Boo!"
const options = {
  reset: true,
  keepFocus: false,
  modifiers: {}
}

try {
  await tab.sendKeys(selector, keys, options)
  console.log("Keys sent!")
  // You may continue your actions here
} catch (err) {
  console.log("Could not send keys:", err)
  nick.exit(1)
}
```

# waitUntilVisible(selectors [, timeout,  condition, callback])
**Waits for a list of `selectors` CSS selectors to be visible.**
Aborts with an error if the elements have not become visible after `timeout` milliseconds.





`selectors` can be an array of CSS selectors (array of strings) or a single CSS selector (string).

By default, `condition` is `"and"` (wait for the visibility of **all** CSS selectors) but it can be changed to `"or"` (wait for the visibility of **any** CSS selector).

### — selectors `(Array or String)`

What to wait for. Can be an array of CSS selectors (array of strings) or a single CSS selector (string).

### — timeout `(Number)`

Maximum number of milliseconds to wait for, by default it is set to 5000(*optional*).
`callback` will be called with an error if the elements have not become visible after `timeout` milliseconds.

### — [condition] `(String)`

When `selectors` is an array, this optional argument lets you choose how to wait for the CSS selectors(*optional*).
If `condition` is `"and"` (the default), the method will wait for the visibility of **all** CSS selectors.
On the other hand, if `condition` is `"or"`, the method will wait for the visibility of **any** CSS selector.

### — callback `(Function(err, selector))`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a description of what went wrong if the CSS selectors were not visible after `timeout` milliseconds
* **`selector (String)`**:
  * In case of success (`err` is `null`):
    * If condition was `"and"` then `selector` is `null` because all CSS selectors are visible
    * If condition was `"or"` then `selector` is one of the visible CSS selectors of the given array
  * In case of failure (`err` is not `null`):
    * If condition was `"and"` then `selector` is one of the non-visible CSS selectors of the given array
    * If condition was `"or"` then `selector` is `null` because none of the CSS selectors are visible
##### Example
```javascript
const selectors = "#header > h1.big-title"
const pageTimeout = 5000

try {
  await tab.waitUntilVisible(selectors, pageTimeout)
  // Manipulate the element here
  // for example with a click() or evaluate()
} catch(err) {
  console.log("Oh no! Even after 5s, the element was still not visible. " + err)
  nick.exit(1)
}
```

##### Example
```javascript
const selectors = ["#header > h1", "img.product-image"]
const pageTimeout = 6000

try {
  await tab.waitUntilVisible(selectors, pageTimeout)
  // Manipulate the element here
  // for example with a click() or evaluate()
} catch(err) {
  console.log("Oh no! Even after 6s, at least one of the element was still not visible. " + err)
  nick.exit(1)
}
```

##### Example
```javascript
var selectors = ["section.footer", "section.header"]
var pageTimeout = 7000

try {
  const selector = await tab.waitUntilVisible(selectors, pageTimeout)
  console.log("This element is visible: " + selector)
  // Manipulate the element here
  // For example with a click() or evaluate()
} catch(err) {
  console.log("Oh no! Even after 7s, all the elements were still not visible. " + err)
  // in this case, the callback does not return which element is not visible
  // because ALL the elements are not visible
  nick.exit(1)
}
```