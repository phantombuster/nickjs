<p align="center">
  <a href="https://nickjs.org/">
    <img alt="NickJS" src="https://raw.githubusercontent.com/phantombuster/nickjs/master/logo.png">
  </a>
</p>

<p align="center">
  A modern headless browser library, as simple as it is powerful.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nickjs"><img alt="NPM version" src="https://img.shields.io/npm/v/nickjs.svg?style=flat-square"></a>
  <a href="https://gitter.im/phantombuster/Lobby"><img alt="Gitter room" src="https://img.shields.io/gitter/room/Phantombuster/Lobby.svg?style=flat-square"></a>
  <a href="https://twitter.com/phbuster"><img alt="Twitter follow" src="https://img.shields.io/twitter/follow/phbuster.svg?style=social&label=Follow"></a>
</p>

* 13 methods only
* Async-await ready (it also works with callbacks)
* Built to support any driver (today PhantomJS+CasperJS; Chromium headless coming soon)

NickJS started as a very basic need to simplify our lives writing lines of PhantomJS.
<br>As we started working on [Phantombuster](https://phantombuster.com), we realised we needed a higher-level library, as simple and powerful as possible, and which would be evolutive since it was clear Chromium headless was going to be a big thing.

We hope you'll enjoy using it and to get the discussion started.

Feel free to get in touch, suggest pull requests and add your own drivers!

(Official website coming soon on https://nickjs.org)

The 13 methods
---

Full documentation on each method is about to be released

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

Google search example
---

```javascript
import Nick from '../Nick'
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

Running an example (using the CasperJS+PhantomJS driver)
---

```shell
npm install nickjs

npm install casperjs

npm install phantomjs-prebuilt

export PHANTOMJS_EXECUTABLE=node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs

./node_modules/casperjs/bin/casperjs node_modules/nickjs/lib/examples/google-search-await.js
```

Getting started with the CasperJS+PhantomJS driver
---

Coming soon!
