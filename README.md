<p align="center">
  <a href="http://nickjs.org/">
    <img alt="NickJS" src="https://raw.githubusercontent.com/phantombuster/nickjs/master/logo.png">
  </a>
</p>

<p align="center">
  Web scraping library made by the <a href="https://phantombuster.com">Phantombuster</a> team. Modern, simple & works on all websites.
</p>

<p align="center">
  <a href="https://travis-ci.org/phantombuster/nickjs"><img alt="Travis CI build status" src="https://img.shields.io/travis/phantombuster/nickjs.svg?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/nickjs"><img alt="NPM version" src="https://img.shields.io/npm/v/nickjs.svg?style=flat-square"></a>
  <a href="https://gitter.im/phantombuster/nickjs"><img alt="Gitter room" src="https://img.shields.io/gitter/room/Phantombuster/Lobby.svg?style=flat-square"></a>
  <a href="https://twitter.com/phbuster"><img alt="Twitter follow" src="https://img.shields.io/twitter/follow/phbuster.svg?style=social&label=Follow"></a>
</p>

<p align="center">
  <a href="http://nickjs.org">NickJS.org</a> — <a href="https://github.com/phantombuster/nickjs#documentation">Inline doc ↓</a> — <b><a href="https://hub.phantombuster.com/v1/reference#nick">Hosted doc</a></b>
</p>

* Supports both Headless Chrome and PhantomJS as drivers
* Simple high-level API
* Async/await, Promises and callback coding styles

NickJS allows you to automate navigation and collect data from any website. By controlling an instance of either [Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome) or [PhantomJS with CasperJS](http://casperjs.org/), your bots will simulate a human.

It's simple and allows for an easy implementation of our [3 scraping steps theory](https://blog.phantombuster.com/were-making-web-scraping-so-easy-that-you-re-going-to-love-it-d3efe3a3fad4).

# Example code

```javascript
const Nick = require("nickjs")
const nick = new Nick()

;(async () => {

	const tab = await nick.newTab()
	await tab.open("news.ycombinator.com")

	await tab.untilVisible("#hnmain") // Make sure we have loaded the page

	await tab.inject("http://code.jquery.com/jquery-3.2.1.min.js") // We're going to use jQuery to scrape
	const hackerNewsLinks = await tab.evaluate((arg, callback) => {
		// Here we're in the page context. It's like being in your browser's inspector tool
		const data = []
		$(".athing").each((index, element) => {
			data.push({
				title: $(element).find(".storylink").text(),
				url: $(element).find(".storylink").attr("href")
			})
		})
		callback(null, data)
	})

	console.log(JSON.stringify(hackerNewsLinks, null, 2))

})()
.then(() => {
	console.log("Job done!")
	nick.exit()
})
.catch((err) => {
	console.log(`Something went wrong: ${err}`)
	nick.exit(1)
})
```

# Usage

First of all, install NickJS: `npm install nickjs`.

NickJS will choose which headless browser to use depending on how you launch it. When launching your script with `node`, Headless Chrome will be used. When launched with `casperjs`, CasperJS+PhantomJS will be used.

To get started with the PhantomJS driver, [read this](PHANTOMJS.md). However we recommend using Headless Chrome (read on).

You'll need to have Node 7+ and Chrome 63+ installed on your system (read the next section for more info about which Chrome version you should use). The path to the Chrome executable can be specified with `export CHROME_PATH=/path/to/chrome` otherwise the binary `google-chrome-beta` will be used.

Launching a bot is then as simple as `node my_nickjs_script.js`.

## Headless Chrome version

NickJS makes use of the latest DevTools protocol methods, so you'll need a very recent version of Chrome.

At the time of writing, NickJS is using some methods from Chrome 63, which is the Beta Channel. Having the correct version of Chrome is critical for a smooth experience with NickJS. Go to the [Chrome Release Channels](https://www.chromium.org/getting-involved/dev-channel) page and download a version compatible with your system. If you want this to be taken care of for you, check out [Phantombuster](https://phantombuster.com), which is basically our "NickJS as a service" platform.

## Environment variables

The following environment variables have an effect on NickJS:

- `CHROME_PATH`: **specifies where to find the Google Chrome binary — this is important!** Example: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`
- `NICKJS_LOAD_IMAGES` (0 or 1): disables image loading (equivalent to NickJS' constructor option `loadImages`)
- `NICKJS_NO_SANDBOX` (0 or 1): disables Chrome's sandboxing (no effect when the CasperJS+PhantomJS driver is used)
- `NICKJS_PROXY` or `http_proxy`: see below

# HTTP proxy

NickJS supports HTTP (and HTTPS) proxies. Other protocols are not yet supported. To specify which proxy to use, set the `httpProxy` option in [NickJS' constructor](https://hub.phantombuster.com/v1/reference#nick). You can also set the environment variable `NICKJS_PROXY` or the standard `http_proxy` (but the constructor option takes precedence).

Your proxy must be specified in the following format: `http://username:password@proxy.com:3128` (the protocol portion is optional).

Contrary to some other libraries, yes, **NickJS supports proxy authentication with Headless Chrome**.

# Documentation

+ [Nick](#nick)
  + [Nick()](#nickoptions)
  + [deleteAllCookies()](#deleteallcookiescallback)
  + [deleteCookie()](#deletecookiecookiename-cookiedomain-callback)
  + [driver](#driver)
  + [exit()](#exitcode)
  + [getAllCookies()](#getallcookiescallback)
  + [newTab()](#newtab)
  + [setCookie()](#setcookiecookie-callback)
+ [Nick tab](#nick-tab)
  + [click()](#clickselector-callback)
  + [close()](#closecallback)
  + [evaluate()](#evaluateinpagefunction--argumentobject-callback)
  + [fill()](#fillselector-inputs--submit-callback)
  + [getContent()](#getcontentcallback)
  + [getUrl()](#geturlcallback)
  + [inject()](#injecturlorpath--callback)
  + [isPresent()](#ispresentselectors-conditions-callback)
  + [isVisible()](#isvisibleselectors-conditions-callback)
  + [onConfirm](#onconfirm)
  + [onPrompt](#onprompt)
  + [open()](#openurl--options-callback)
  + [screenshot()](#screenshotfilename--callback)
  + [scroll()](#scrollx-y,-callback)
  + [scrollToBottom()](#scrolltobottomcallback)
  + [sendKeys()](#sendkeysselector-keys-options-callback)
  + [wait()](#waitduration-callback)
  + [waitUntilPresent()](#waituntilpresentselectors--timeout--condition-callback)
  + [waitUntilVisible()](#waituntilvisibleselectors--timeout--condition-callback)
  + [waitWhilePresent()](#waitwhilepresentselectors--timeout--condition-callback)
  + [waitWhileVisible()](#waitwhilevisibleselectors--timeout--condition-callback)



# Nick


# Nick([options])
**This is Nick's constructor. `options` is an optional argument that lets you configure your Nick instance.**



Nick must be instantiated only once. Behind the scenes, the headless browser driver is initialized. The next step is to open a tab with [newTab()](https://hub.phantombuster.com/v1/reference#nick-newtab).

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
const Nick = require("nickjs")
const nick = new Nick()
```

##### All options (ES6+)
```javascript
const Nick = require("nickjs")

// these are the default options
const nick = new Nick({
  printNavigation: true,
  printResourceErrors: true,
  printPageErrors: true,
  timeout: 10000,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36"
})
```

# deleteAllCookies([callback])
**Deletes all cookies set to the headless browser.**

### — callback `(Function)`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong



##### Example
```javascript
try {
  await nick.deleteAllCookies()
  // All cookies are cleanded up
} catch (err) {
  console.log("Could not delete all cookies:", err)
}
```

##### :no_entry_sign: Warning
> This method will delete all cookies that might be necessary to your bot.

# deleteCookie(cookieName, cookieDomain[, callback])
**Deletes a specific cookie set in the headless browser.**

### — callback `(Function)`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong.

##### Example
```javascript
const cookieName = "cookieName"
const cookieDomain = ".domain.com"

try {
  await nick.deleteCookie(cookieName, cookieDomain)
} catch (err) {
  console.log("Could not delete cookie:", err)
}
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

# getAllCookies([callback])
**Gets an object containing all cookies set in the headless browser.**

### — callback `(Function)`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong.
* **`cookies (PlainObject)`**: an object containing all cookies of the headless browser and their properties

##### Example
```javascript
try {
  const cookies = await nick.getAllCookies()
  // Cookies contain all your cookies
  console.log(cookies, null, 2)
} catch (err) {
  console.log("Could not get all cookies:", err)
}
```

# newTab()
**Opens a new tab.**

This is the first step in manipulating a website.

To open multiple tabs, call this method multiple times. If your bot opens many tabs to do different tasks, it's a good idea to [close()](https://hub.phantombuster.com/v1/reference#nick-close) them when their work is finished (to keep memory usage down).

##### Example
```javascript
try {
  const tab = await nick.newTab()
  // You can now browse any website using `tab`
} catch (err) {
  console.log("An error occured:", err)
}
```

# setCookie(cookie[, callback])
**Sets a cookie.**

Set the name, the value and the domain of a cookie.
This cookie can be seen with [getAllCookies()](ref:getallcookies)  and deleted with [deleteAllCookies()](ref:deleteallcookies) or [deleteCookie()](ref:deletecookie).


### — cookie `(PlainObject)`

An object containing all attributes of a cookie.

* **`name (String)`**: Name of the cookie you want to set.
* **`value (String)`**: Value of the cookie you want to set.
* **`domain (String)`**: Domain linked to the cookie set.

### — callback `(Function)`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong.

##### Example
```javascript
const cookie = {
  name: "cookieName",
  value: "cookieValue",
  domain: ".domain.com"
}

try {
  await nick.setCookie(cookie)
  // You can navigate with your cookie set
} catch (err) {
  console.log("Could not create cookie:", err)
}
```

# Nick-tab


# click(selector[, callback])
**Performs a click on the element matching the CSS selector `selector`.**

Clicking on elements is one of the main ways to manipulate web pages with Nick. Clicking is an easy way to navigate where you want, but keep in mind that it can be more efficient to scrape URLs (for example with [`evaluate()`](https://hub.phantombuster.com/v1/reference#nick-evaluate)) and then call [`open()`](https://hub.phantombuster.com/v1/reference#nick-open).

### — selector `(String)`

CSS selector targeting what element to click.
Probably a `button` or an `a` but can be anything you want.
Make sure the target element is visible or present by calling [`waitUntilVisible()`](https://hub.phantombuster.com/v1/reference#nick-waituntilvisible) or [`waitUntilPresent()`](https://hub.phantombuster.com/v1/reference#nick-waituntilpresent) beforehand.

### — callback `(Function(err))`

Function called when finished (*optional*).
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
}
// Continue your navigation in this branch
// You should probably do a waitUntilVisible() or waitUntilPresent() here
```

##### :warning: Make sure your target is here
> Before calling `click()` you should make sure the element you are trying to click on is actually visible or present in the page by using [`waitUntilVisible()`](https://hub.phantombuster.com/v1/reference#nick-waituntilvisible) or [`waitUntilPresent()`](https://hub.phantombuster.com/v1/reference#nick-waituntilpresent).

# close([callback])
**Closes the `tab` in current use.**

After `close()` is called, the tab becomes unusable.
All subsequent method calls will throw an exception saying that this specific tab instance has stopped.
Lose all references to the instance for it to be garbage-collected and clean cookies and cache used for the whole nick.


### — callback `(Function)`

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong







##### Example
```javascript
try {
  await tab.close()
  // tab can not be used here anymore
  // but you may continue other actions
} catch (err) {
  console.log("Could not close tab:", err)
}
```

##### :information_source: It's like closing a tab in your browser
> This method is useful when using multiple Nick instances to simulate browsing on multiple tabs. Calling `close()` is the equivalent of closing a tab.

##### :information_source: Tips
> It can be also useful if you want to iterate on many URLs, the fact that close() clear cache and cookies free a lot of memory.

##### :no_entry_sign: Warning
> Calling `close()` will clear the cookies and cache of the **whole `nick`** instantiated before.

# evaluate(inPageFunction [, argumentObject, callback])
**Executes `inPageFunction` in the current page context.**

Nick provides you with **two separate JavaScript contexts**:
1. **Where the Nick code runs**: this is your script environment, with all your locally declared variables and all your calls to Nick methods
2. **Where the page code runs**: this is where the page executes jQuery or AngularJS code for example

The `evaluate()` method allows you to declare a function in your Nick context (1) and executes it in the page context (2). **It's like executing code in your browser's inspector tool**: you can do anything you want with the page.

In the page context, you have access to all the global variables declared by the page, as well as the DOM (`window`, `document`, ...). Any JavaScript libraries included by the page can also be used.

If the page does not include what you want (jQuery or underscore for example), you can inject any JavaScript file with [`inject()`](https://hub.phantombuster.com/v1/reference#nick-inject) before calling `evaluate()`.

### — inPageFunction `(Function(argumentObject, callback))`

Function to execute in the current page context. `argumentObject` will be passed as its first argument and a `callback` as it second argument.
`argumentObject` is an empty plainObject by default.
`callback` is the function to call when finished.
* **`err (String)`**: `null` if the function succeeds otherwise put a description of what went wrong
* **`res (Any)`**: return value of `inPageFunction` in case of success (this value is serialized to be transferred back to the Nick context — complex object like DOM elements, functions or jQuery objects cannot be returned to the Nick context reliably)

### — [argumentObject] `(PlainObject)`

Optional object that will be passed as an argument of `inPageFunction` (*optional*).
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
  console.log("Scraped this link:", res)
  // Continue your navigation here
} catch (err) {
  console.log("Something went wrong:", err)
}
```

##### :no_entry_sign: Local variables not accessible
> Because `inPageFunction` is executed in the current page context, your local variables that have been declared before your `evaluate()` call will **not** be accessible. You can, however, transfer variables using the `argumentObject` parameter.

**For this reason, Nick methods won't be available inside evaluate.**

##### :no_entry_sign: Error in callback
> When returning data with the callback in the `inPageFunction` take care to always set the first argument as `null` if there is no error.

##### :warning: Serialization subtleties
> Keep in mind that to transfer `inPageFunction` and its return value to and from the page context, serialization has to occur. Everything becomes a string at some point. **So you cannot return DOM elements or jQuery objects from the page.** Moreover, the underlying PhantomJS browser has [a bug](https://github.com/ariya/phantomjs/issues/11268) where serialization of `null` gives an empty string `""` (even in nested objects and arrays). Beware!

# fill(selector, inputs [, submit, callback])
**Fills a form with the given values and optionally submits it.**

 Inputs are referenced by their name attribute.

### — selector `(String)`

CSS selector targeting what form to fill. It should point to a `form` tag. Make sure the target form is visible or present by calling [`waitUntilVisible()`](https://hub.phantombuster.com/v1/reference#nick-waituntilvisible) or [`waitUntilPresent()`](https://hub.phantombuster.com/v1/reference#nick-waituntilpresent) beforehand.

### — inputs `(PlainObject)`

An object containing the data you want to enter in the form.
**Keys must correspond to the inputs' `name` attribute.** This method supports single `select` fields in the same way as normal `input` fields. For `select` fields allowing multiple selections, supply an array of values to match against.

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

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong
* **`content (String)`**: the full HTML content of the current webpage.




##### Example
```javascript
try {
  const content = await tab.getContent()
  // content contains the content of the current webpage
} catch (err) {
  console.log("Could not get the content of the page:", err)
}
```

##### :warning: Note
> When the current page is a dynamic JavaScript powered HTML page, `getContent()` will return a snapshot of the current state of the DOM and not the initial source code.

# getUrl([callback])
**Returns the current page URL as a string.**

### — callback `(Function(err))`

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong
* **`url (String)`**: the full `URL` of the current page.



##### Example
```javascript
try {
  const url = await tab.getUrl()
  console.log("The url of the page is", url)
  // You can use the variable url and continue your actions
} catch (err) {
  console.log("Could not get the current url:", err)
}
```

##### :information_source: Note
> The URL you get will be URL-decoded.

# inject(urlOrPath [, callback])
**Injects a script in the current DOM page context.**

The script can be stored locally on disk or on a remote server.

### — urlOrPath `(String)`

Path to a local or remote script.

### — callback `(Function(err))`

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong

##### Example
```javascript
const urlOrPath = "https://code.jquery.com/jquery-3.2.1.min.js"

try {
  await tab.inject(urlOrPath)
  console.log("Jquery script inserted!")
  //You may now use tab.evaluate() and use jQuery functions
} catch (err) {
  console.log("Could not inject jQuery:", err)
}
```

# isPresent(selectors[, conditions, callback])
**Checks for a list of `selectors` CSS selectors if they are present in the DOM and return a boolean: `true` if the selectors are present and `false` in the contrary.**

### — selectors `(Array or String)`

What to look for in the DOM. Can be an array of CSS selectors (array of strings) or a single CSS selector (string).

### — [condition] `(String)`

When `selectors` is an array, this optional argument lets you choose how to wait for the CSS selectors(*optional*).
If `condition` is `"and"` (the default), the method will check for the presence of **all** CSS selectors.
On the other hand, if `condition` is `"or"`, the method will check for the presence of **any** CSS selector.

### — callback `(Function(err, selector))`

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if the function fails to check
* **`visible (Boolean)`**: `true` if the condition succeeds or `false` in the contrary
##### Example
```javascript
const selectors = ["div.first", "div.second"]

const present = await tab.isPresent(selectors, "or")
if (present) {
  // Either .first or .second is present at this time
} else {
  console.log("Elements aren't present")
}
```

# isVisible(selectors[, conditions, callback])
**Checks for a list of `selectors` CSS selectors if they are visible in the page and return a boolean: `true` if the selectors are visible and `false` in the contrary.**

### — selectors `(Array or String)`

What to check for. Can be an array of CSS selectors (array of strings) or a single CSS selector (string).

### — [condition] `(String)`

When `selectors` is an array, this optional argument lets you choose how to wait for the CSS selectors (*optional*).
If `condition` is `"and"` (the default), the method will check for the visibility of **all** CSS selectors.
On the other hand, if `condition` is `"or"`, the method will check for the visibility of **any** CSS selector.

### — callback `(Function(err, selector))`

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if the function fails to check
* **`visible (Boolean)`**: `true` if the condition succeeds or `false` in the contrary
##### Example
```javascript
const selectors = ["div.first", "div.second"]

const visible = await tab.isVisible(selectors, "or")
if (visible) {
  // Either .first or .second is visible at this time
} else {
  console.log("Elements aren't visible")
}
```

# onConfirm
**Sets an event to a JS confirm alert.**
Executes the function assigned to this variable whenever a confirm dialog is called by `window.confirm`.
The only parameter is the message sent by the dialog, and the function needs to return the user's response as a boolean.

### — message `(String)`
A string containing the message from the confirm dialog.

##### ES6+
```javascript
tab.onConfirm = (message) => {
  console.log("The confirm messsage is", message)
  return true
}
```

# onPrompt
**Sets an event to a JS prompt alert.**
Executes the function assigned to this variable whenever a prompt dialog is called by `window.prompt()`.
The only parameter is the message sent by the dialog, and the function needs to return the user's response as a string.

### — message `(String)`
A string containing the message from the prompt dialog.

##### ES6+
```javascript
tab.onPrompt = (message) => {
  console.log("The prompt message is", message)
  return "Response"
}
```

# open(url [, options, callback])
**Opens the webpage at `url`.**

By default, it's a `GET` but you can forge any type of HTTP request using the `options` parameter.

Opening a page will time out after 10 seconds. This can be changed with the `resourceTimeout` Nick option (see [Nick's options](https://hub.phantombuster.com/v1/reference#nick)). Note: this time out concerns the initial page but not the resources the page requires thereafter.

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
    console.log("The site responded with", httpCode, httpStatus)
  } else {
    console.log("Successfully opened", url, ":", httpCode, httpStatus)
    // Manipulate the page in this branch
    // You should probably do a waitUntilVisible() or waitUntilPresent() here
  }
} catch(err) {
  console.log("Could not open page:", err)
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
> Many pages on the web load slowly and unreliably. Many more make numerous aynchronous queries. For these reasons, you should always wait for the DOM elements that interest you after opening a page with [`waitUntilVisible()`](https://hub.phantombuster.com/v1/reference#nick-waitUntilVisible)or [`waitUntilPresent()`](https://hub.phantombuster.com/v1/reference#nick-waituntilpresent).

# screenshot(filename [, callback])
**Takes a screenshot of the current page.**

### — path `(String)`

The local path of the screenshot.
The format is defined by the file extension. 'image.jpg' will create a JPEG image in the current folder.

### — callback `(Function(err))`

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong

##### Example
```javascript
const path = "./image.jpg"

try {
  await tab.screenshot(path)
  console.log("Screenshot saved at", path)
  // Your screenshot is available at this path
} catch (err) {
  console.log("Could not take a screenshot:", err)
}
```

# scroll(x, y,[, callback])
**Scrolls to coordinates `[x,y]` on the page.**

### — x `(Number)`
The X-axis coordinate in pixels to scroll to (horizontally).

### — y `(Number)`
The Y-axis coordinate in pixels to scroll to (vertically).

### — callback `(Function(err))`
Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong

##### Example
```javascript
const x = 1000
const y = 2000

try {
  await tab.scroll(x, y)
  // Your position will be [1000, 2000] in the page now
} catch (err) {
  console.log("Could not scroll to coordinates:", err)
}
```

##### :information_source: Tips
> _scroll() can also be called using scrollTo()_

# scrollToBottom([callback])
**Scrolls to the bottom of the page.**

### — callback `(Function(err))`
Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong
##### Example
```javascript
try {
  await tab.scrollToBottom()
  // You are now at the bottom of the page
} catch (err) {
  console.log("An error occured during the scroll to bottom:", err)
}
```

# sendKeys(selector, keys[, options, callback])
**Writes `keys` in an `<input>`, `<textarea>` or any DOM element with `contenteditable="true"` in the current page.**

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
* **`err (String)`**: `null` or a description of what went wrong if something went wrong

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
}
```

# wait(duration[, callback])
**Wait for `duration` milliseconds.**




### — duration `(Number)`
The number of milliseconds to wait for.

### — callback `(Function(err))`
Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if something went wrong
##### :no_entry_sign: Warning
> This function has nothing to do with the tab you are using, it is pure syntactic sugar to replace `Promise.delay()` (from [Bluebird](http://bluebirdjs.com/docs/api/promise.delay.html)).
It is like waiting in front of your computer after opening a web page.

##### Example
```javascript
try {
  await tab.doSomething()
  await tab.wait(10000)
  // After waiting 10 seconds the script continues
  await tab.doSomething()
} catch (err) {
  console.log("An error occured during the execution:", err)
}
```

# waitUntilPresent(selectors [, timeout,  condition, callback])
**Waits for a list of `selectors` CSS selectors to be present in the DOM.**
Aborts with an error if the elements have not become present in the DOM after `timeout` milliseconds.

`selectors` can be an array of CSS selectors (array of strings) or a single CSS selector (string).

By default, `condition` is `"and"` (wait for **all** CSS selectors) but it can be changed to `"or"` (wait for **any** CSS selector).

### — selectors `(Array or String)`

What to wait for. Can be an array of CSS selectors (array of strings) or a single CSS selector (string).

### — timeout `(Number)`

Maximum number of milliseconds to wait for, by default it is set to 5000(*optional*).
`callback` will be called with an error if the elements have not become present after `timeout` milliseconds.

### — [condition] `(String)`

When `selectors` is an array, this optional argument lets you choose how to wait for the CSS selectors(*optional*).
If `condition` is `"and"` (the default), the method will wait for **all** CSS selectors.
On the other hand, if `condition` is `"or"`, the method will wait for **any** CSS selector.

### — callback `(Function(err, selector))`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a description of what went wrong if the CSS selectors were not present after `timeout` milliseconds
* **`selector (String)`**:
  * In case of success (`err` is `null`):
    * If condition was `"and"` then `selector` is `null` because all CSS selectors are present
    * If condition was `"or"` then `selector` is one of the present CSS selectors of the given array
  * In case of failure (`err` is not `null`):
    * If condition was `"and"` then `selector` is one of the non-present CSS selectors of the given array
    * If condition was `"or"` then `selector` is `null` because none of the CSS selectors are present
##### Example
```javascript
const selectors = "#header > h1.big-title"
const pageTimeout = 5000

try {
  await tab.waitUntilPresent(selectors, pageTimeout)
  // The element is present in the DOM
} catch(err) {
  console.log("Oh no! Even after 5s, the element was still not present. ", err)
}
```

# waitUntilVisible(selectors [, timeout,  condition, callback])
**Waits for a list of `selectors` CSS selectors to be visible.**
Aborts with an error if the elements have not become visible after `timeout` milliseconds.





`selectors` can be an array of CSS selectors (array of strings) or a single CSS selector (string).

By default, `condition` is `"and"` (wait for **all** CSS selectors) but it can be changed to `"or"` (wait for **any** CSS selector).

### — selectors `(Array or String)`

What to wait for. Can be an array of CSS selectors (array of strings) or a single CSS selector (string).

### — timeout `(Number)`

Maximum number of milliseconds to wait for, by default it is set to 5000(*optional*).
`callback` will be called with an error if the elements have not become visible after `timeout` milliseconds.

### — [condition] `(String)`

When `selectors` is an array, this optional argument lets you choose how to wait for the CSS selectors(*optional*).
If `condition` is `"and"` (the default), the method will wait for **all** CSS selectors.
On the other hand, if `condition` is `"or"`, the method will wait for **any** CSS selector.

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
  console.log("Oh no! Even after 5s, the element was still not visible:", err)
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
  console.log("Oh no! Even after 6s, at least one of the element was still not visible:", err)
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
}
```

# waitWhilePresent(selectors [, timeout,  condition, callback])
**Waits for a list of `selectors` CSS selectors to become non-present in the DOM.**
Aborts with an error if the elements are still present in the DOM after `timeout` milliseconds.

`selectors` can be an array of CSS selectors (array of strings) or a single CSS selector (string).

By default, `condition` is `"and"` (wait for **all** CSS selectors) but it can be changed to `"or"` (wait for **any** CSS selector).

### — selectors `(Array or String)`

What to wait for. Can be an array of CSS selectors (array of strings) or a single CSS selector (string).

### — timeout `(Number)`

The maximum number of milliseconds to wait for, by default it is set to 5000 (*optional*).
`callback` will be called with an error if the elements are still present after `timeout` milliseconds.

### — [condition] `(String)`

When `selectors` is an array, this optional argument lets you choose how to wait for the CSS selectors (*optional*).
If `condition` is `"and"` (the default), the method will wait for **all** CSS selectors.
On the other hand, if `condition` is `"or"`, the method will wait for **any** CSS selector.

### — callback `(Function(err, selector))`

Function called when finished (*optional*).
* **`err (String)`**: `null` or a description of what went wrong if the CSS selectors were still present after `timeout` milliseconds
* **`selector (String)`**:
  * In case of success (`err` is `null`):
    * If condition was `"and"` then `selector` is `null` because none of the CSS selectors are present
    * If condition was `"or"` then `selector` is one of the non-present CSS selectors of the given array
  * In case of failure (`err` is not `null`):
    * If condition was `"and"` then `selector` is one of the still present CSS selectors of the given array
    * If condition was `"or"` then `selector` is `null` because all of the CSS selectors are still present
##### Example
```javascript
const selectors = "#header > h1.big-title"
const pageTimeout = 5000

try {
  await tab.waitWhilePresent(selectors, pageTimeout)
  // The selector has succesfully become non-present
} catch(err) {
  console.log("Oh no! Even after 5s, the element was still present:", err)
}
```

# waitWhileVisible(selectors [, timeout,  condition, callback])
**Waits for a list of `selectors` CSS selectors to become non-visible.**
Aborts with an error if the elements are still visible after `timeout` milliseconds.

`selectors` can be an array of CSS selectors (array of strings) or a single CSS selector (string).

By default, `condition` is `"and"` (wait for **all** CSS selectors) but it can be changed to `"or"` (wait for **any** CSS selector).

### — selectors `(Array or String)`

What to wait for. Can be an array of CSS selectors (array of strings) or a single CSS selector (string).

### — timeout `(Number)`

The maximum number of milliseconds to wait for, by default it is set to 5000 (*optional*).
`callback` will be called with an error if the elements are still visible after `timeout` milliseconds.

### — [condition] `(String)`

When `selectors` is an array, this optional argument lets you choose how to wait for the CSS selectors(*optional*).
If `condition` is `"and"` (the default), the method will wait for **all** CSS selectors.
On the other hand, if `condition` is `"or"`, the method will wait for **any** CSS selector.

### — callback `(Function(err, selector))`

Function called when finished(*optional*).
* **`err (String)`**: `null` or a description of what went wrong if the CSS selectors were still visible after `timeout` milliseconds
* **`selector (String)`**:
  * In case of success (`err` is `null`):
    * If condition was `"and"` then `selector` is `null` because none of the CSS selectors are visible
    * If condition was `"or"` then `selector` is one of the non-visible CSS selectors of the given array
  * In case of failure (`err` is not `null`):
    * If condition was `"and"` then `selector` is one of the still visible CSS selectors of the given array
    * If condition was `"or"` then `selector` is `null` because all of the CSS selectors are still visible
##### Example
```javascript
const selectors = "#header > h1.big-title"
const pageTimeout = 5000

try {
  await tab.waitWhileVisible(selectors, pageTimeout)
  // The selector has succesfully become non-visible
} catch(err) {
  console.log("Oh no! Even after 5s, the element was still visible:", err)
}
```
