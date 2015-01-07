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
var Plugin = require('./lib/plugin');
var Storage = require('./lib/storage');

/**
 * If we weren't required, start an instance of a nullstar bot.
 */

if (!module.parent) {
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
      plugins: bot.plugins,
      storage: bot.storage,
      irc: bot.connection,
      db: bot.storage
    }
  });

  // gracefully exit
  process.on('SIGTERM', function() {
    bot.storage.close(function() {
      bot.disconnect('https://twitter.com/' + bot.get('twitter username', 'nullstar'), function() {
        setTimeout(function() {
          process.exit();
        }, 2000);
      });
    });
  });
}

/**
 * Expose `Bot`.
 */

exports.Bot = Bot;

/**
 * Expose `Plugin`.
 */

exports.Plugin = Plugin;

/**
 * Expose `Storage`.
 */

exports.Storage = Storage;