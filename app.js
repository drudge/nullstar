/*!
 * nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var NullstarBot = require('./lib/nullstar_bot');
var config = require('./config.json');

var bot = new NullstarBot().set(config).connect();

process.on('SIGTERM', function() {
  bot.disconnect('bye - https://twitter.com/' + config['twitter username']);
});