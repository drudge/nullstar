/*!
* Nullstar
* Copyright(c) 2014 Nicholas Penree <nick@penree.com>
* MIT Licensed
*/

/**
 * Module dependencies.
 */

var request = require('request');
var Plugin = require('../plugin');
var inherits = require('util').inherits;
var format = require('util').format;
var debug = require('debug')('nullstar:plugin:vine');
var timeago = require('timeago');
var ent = require('ent');

/**
 * Creates an instance of a `VinePlugin`.
 *
 * @constructor
 * @this {VinePlugin}
 * @param {Bot} bot
 * @api public
 */

function VinePlugin(bot) {
  Plugin.call(this, bot);
}

/**
 * Inherit from `Plugin`.
 */

inherits(VinePlugin, Plugin);

/**
 * The plugin name.
 */

VinePlugin.prototype.name = 'Vine Plugin';

/**
 * The plugin version.
 */

VinePlugin.prototype.version = '0.1';

/**
 * Handle an incoming message, and notice tweet content in channel if wanted.
 *
 * @param {String} from
 * @param {String} channel
 * @param {String} message
 * @return {Boolean}
 * @api public
 */

VinePlugin.prototype.handle = function(from, channel, message) {
  // only perform tweet actions on allowed channels
  if (this.get('vine allowed channels', []).indexOf(channel) === -1) return false;

  // handle plugin commands
  var handled = VinePlugin.super_.prototype.handle.call(this, from, channel, message);
  var matches = message.match(/https?:\/\/vine\.co\/v\/\S+/);
  if (!handled && this.get('vine notice vines', true) && matches && matches.length) {
    var url = matches[0];
    var reqUrl = format('https://vine.co/oembed.json?url=%s', ent.encode(url));

    debug('vine url %s', url);
    debug('api url %s', reqUrl);

    request(reqUrl, function(err, res, body) {
      var json;

      if (err) debug(err.stack);
      if (!body) return;

      try {
        json = JSON.parse(body);
      } catch(e) {
        debug('parsing json failed: %s', e.message);
      }

      if (!(json && json.author_name && json.title)) return;

      var msg = format('\00300,03\002Vine\017 | %s: %s', ent.decode(json.author_name), ent.decode(json.title));

      debug(msg);

      if (msg) this.bot.notice(channel, msg);
    }.bind(this));

    handled = true;
  }

  return handled;
};

/**
 * Expose `VinePlugin`.
 */

module.exports = VinePlugin;
