/*!
 * nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

var NullstarBot = require('./lib/nullstar_bot');

var bot = new NullstarBot();
var config = require('./config.json');

bot
  .set(config)
  .connect();