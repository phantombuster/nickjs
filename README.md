NickJS
======


A modern headless browser library, as simple as it is powerful.

* 13 methods only 
* Async-await ready (it also works with callbacks)
* Built to support any driver (today PhantomJS+CasperJS; Chromium headless coming soon)


NickJS started as a very basic need to simplify our lives writing lines of PhantomJS. 
<br>As we started working on [Phantombuster](https://phantombuster.com), we realised we needed a higher-level library, as simple and powerful as possible, and which would be evolutive since it was clear Chromium headless was going to be a big thing.

We hope you'll enjoy using it and to get the discussion started. 

Feel free to get in touch, suggest pull requests and add your own drivers!


(Official website coming soon on https://nickjs.org)


The 13 methods
---------

Full documentation on each method is about to be released

```
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

Running the examples (using the CasperJS+PhantomJS driver)
------------------------------------------------

    npm install nickjs
    
    npm install casperjs
    
    npm install phantomjs-prebuilt
    
    export PHANTOMJS_EXECUTABLE=node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs
    ./node_modules/casperjs/bin/casperjs node_modules/nickjs/lib/examples/google-search-await.js
