/*!
 * Nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var replify = require('replify');
var Bot = require('./lib/bot');
var config = require(process.env.CONFIG || './config.json');
var bot = new Bot(config);

// setup the bot
bot
  .plugin('*')
  .connect();

// setup a repl for fun and profit
replify({
  name: 'nullstar',
  contexts: {
    bot: bot,
    irc: bot.connection,
    plugins: bot.plugins
  }
});

// gracefully exit
process.on('SIGTERM', function() {
  bot.db.close(function() {
    bot.disconnect('bye - https://twitter.com/' + config['twitter username'], function() {
      setTimeout(function() {
        process.exit();
      }, 2000);
    });
  });
});
