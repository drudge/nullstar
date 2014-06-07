/*!
* Nullstar
* Copyright(c) 2014 Nicholas Penree <nick@penree.com>
* MIT Licensed
*/

/**
 * Module dependencies.
 */

var Plugin = require('../plugin');
var inherits = require('util').inherits;
var debug = require('debug')('nullstar:plugin:linklog');
var request = require('request');

/**
 * Creates an instance of a `LinkLogPlugin`.
 *
 * @constructor
 * @this {LinkLogPlugin}
 * @param {Bot} bot
 * @api public
 */

function LinkLogPlugin(bot) {
  Plugin.call(this, bot);
}

/**
 * Inherit from `Plugin`.
 */

inherits(LinkLogPlugin, Plugin);

/**
 * The plugin name.
 */

LinkLogPlugin.prototype.name = 'Linklog Plugin';

/**
 * The plugin version.
 */

LinkLogPlugin.prototype.version = '0.1.0';

/**
 * Get a list of nicknames for a given `channel`. The nicknames will be in lower-case.
 *
 * @param {String} channel
 * @return {Array}
 * @api private
 */

LinkLogPlugin.prototype.names = function(channel) {
  var users;

  try {
    users = Object.keys(this.bot.connection.chans[channel].users);
  } catch(e) {
  } finally {
    users = users || [];
  }

  return users.map(function(nick) {
    return (nick || '').trim().toLowerCase();
  });
};

/**
 * Handle an incoming message, and apply karma adjustment if needed.
 *
 * @param {String} from
 * @param {String} channel
 * @param {String} message
 * @return {Boolean}
 * @api public
 */

LinkLogPlugin.prototype.handle = function(from, channel, message) {
  var self = this;
  
  if (this.get('linklog capture links', true)) {
    var urls = message.match(/(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig) || []
  
    if (urls.length) debug('found %i urls', urls.length);
    
    urls.forEach(function(url) {
      self.capture({
        date: new Date(),
        nick: from,
        source: channel.toLowerCase(),
        url: url,
        transport: 'irc'
      });
    });
  }

  // handle plugin commands
  return LinkLogPlugin.super_.prototype.handle.call(this, from, channel, message);
};

/**
 * Capture link and send to our linklog.
 *
 * @param {Object} link
 * @param {Function} fn
 * @api public
 */

LinkLogPlugin.prototype.capture = function(link, fn) {
  var self = this;
  request({
    url: self.get('linklog post url'),
    method: 'post',
    json: link
  }, function(err, res, body) {
    debug('status code: %s', res.statusCode);
    if (err) debug('error: %s', err.message);
    if (typeof fn != 'undefined') fn(err);
  });
};

/**
 * Expose `LinkLogPlugin`.
 */

module.exports = LinkLogPlugin;