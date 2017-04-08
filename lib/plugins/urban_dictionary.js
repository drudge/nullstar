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
var format = require('util').format;
var debug = require('debug')('nullstar:plugin:urban_dictionary');
var urban = require('urban');

/**
 * Creates an instance of a `UrbanDictionaryPlugin`.
 *
 * @constructor
 * @this {UrbanDictionaryPlugin}
 * @param {Bot} bot
 * @api public
 */

function UrbanDictionaryPlugin(bot) {
  Plugin.call(this, bot);
}

/**
 * Inherit from `Plugin`.
 */

inherits(UrbanDictionaryPlugin, Plugin);

/**
 * The plugin name.
 */

UrbanDictionaryPlugin.prototype.name = 'Urban Dictionary Plugin';

/**
 * The plugin version.
 */

UrbanDictionaryPlugin.prototype.version = '0.1';

UrbanDictionaryPlugin.prototype.$urban = function(id, nick, channel, query) {
  urban(query).first(function(json) {
    json = json || {};

    if (json.definition) {
      var definition = json.definition.split('\n').map(function(line) {
        return format('> %s', line);
      }).join('\n');
      var text = format(
        '%s (+%s/-%s):\n%s',
        json.word,
        json.thumbs_up,
        json.thumbs_down,
        definition
      );
      this.bot.notice(id, channel, text);
    } else {
      this.bot.notice(id, channel, format('No results found for: %s', query));
    }
  }.bind(this));
};

UrbanDictionaryPlugin.prototype.$ud = UrbanDictionaryPlugin.prototype.$urban;

/**
 * Expose `UrbanDictionaryPlugin`.
 */

module.exports = UrbanDictionaryPlugin;
