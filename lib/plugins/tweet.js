/*!
* Nullstar
* Copyright(c) 2014 Nicholas Penree <nick@penree.com>
* MIT Licensed
*/

/**
 * Module dependencies.
 */

var Twitter = require('twitter');
var Plugin = require('../plugin');
var inherits = require('util').inherits;
var format = require('util').format;
var debug = require('debug')('nullstar:plugin:tweet');

/**
 * Creates an instance of a `TweetPlugin`.
 *
 * @constructor
 * @this {TweetPlugin}
 * @param {Bot} bot
 * @api public
 */

function TweetPlugin(bot) {
  Plugin.call(this, bot);
  this.twitter = new Twitter({
    consumer_key: this.get('twitter consumer key'),
    consumer_secret: this.get('twitter consumer secret'),
    access_token_key: this.get('twitter access token'),
    access_token_secret: this.get('twitter access token secret')
  });
}

/**
 * Inherit from `Plugin`.
 */

inherits(TweetPlugin, Plugin);

/**
 * The plugin name.
 */

TweetPlugin.prototype.name = 'Tweet Plugin';

/**
 * The plugin version.
 */

TweetPlugin.prototype.version = '0.5.0';

/**
 * Post `status` as a tweet.
 *
 * @param {String} nick
 * @param {String} chan
 * @param {String} status
 * @return {TweetPlugin} this
 * @api private
 */

TweetPlugin.prototype.$tweet = function(nick, chan, status) {
  var self = this;
  status = (status || '').trim();

  if (status.length) {
    debug('tweeting \'%s\'', status);
    self.twitter.updateStatus(status, function(data) {
      if (data.id_str) {
        self.bot.notice(chan, format('https://twitter.com/%s/status/%s', data.user.screen_name, data.id_str));
      } else {
        self.error(chan, data);
      }
    });
  }

  return this;
};

TweetPlugin.prototype.$twat = function(nick, chan, status) {
  return this.$tweet(nick, chan, status);
};

/**
 * Remove a tweet using the `id` or url.
 *
 * @param {String} nick
 * @param {String} chan
 * @param {String} id/url
 * @return {TweetPlugin} this
 * @api private
 */

TweetPlugin.prototype.$rmtweet = function(nick, chan, id) {
  var self = this;

  if (id.length) {
    var matches = id.match(/https?:\/\/twitter\.com\/.*\/status\/([0-9]+)/);

    if (matches && matches.length >= 2) {
      id = matches[1];
    }

    debug('deleting tweet id \'%s\'', id);

    self.twitter.destroyStatus(id, function(data) {
      if (data.id_str) {
        self.bot.notice(chan, format('Tweet deleted (%s)', id));
      } else {
        self.error(chan, data);
      }
    });
  }

  return this;
};

TweetPlugin.prototype.$rmtwat = function(nick, chan, id) {
  return this.$rmtweet(nick, chan, id);
};

/**
 * Send Twitter webservice error to `channel` as a notice.
 *
 * @param {String} channel
 * @param {Object} data
 * @return {TweetPlugin} this
 * @api public
 */

TweetPlugin.prototype.error = function(channel, data) {
  data = data || {};

  var self = this;
  var errors;

  try {
    var tmp = JSON.parse(data.data);
    errors = tmp.errors;
  } catch (e) {}

  if (errors && errors.length) {
    if (errors.length >= 1) {
      self.bot.error(channel, errors[0]);
    }
  }

  return this;
};

/**
 * Expose `TweetPlugin`.
 */

module.exports = TweetPlugin;
