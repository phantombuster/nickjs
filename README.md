NickJS
======

https://nickjs.org

Simple, modern & powerful browser control library.

Running the examples (CasperJS+PhantomJS driver)
------------------------------------------------

npm install nickjs
npm install casperjs
npm install phantomjs-prebuilt
export PHANTOMJS_EXECUTABLE=node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs
./node_modules/casperjs/bin/casperjs node_modules/nickjs/lib/examples/google-search-await.js
