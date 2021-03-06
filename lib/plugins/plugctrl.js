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
var readdir = require('fs').readdir;
var debug = require('debug')('nullstar:plugin:plugctrl');

/**
 * Creates an instance of a `PluginControlPlugin`.
 *
 * @constructor
 * @this {PluginControlPlugin}
 * @param {Bot} bot
 * @api public
 */

function PluginControlPlugin(bot) {
  Plugin.call(this, bot);
}

/**
 * Inherit from `Plugin`.
 */

inherits(PluginControlPlugin, Plugin);

/**
 * The plugin name.
 */

PluginControlPlugin.prototype.name = 'Plugin Control Plugin';

/**
 * The plugin version.
 */

PluginControlPlugin.prototype.version = '1.0';

/**
 * Load a plugin with a given `name`.
 *
 * @param {String} id
 * @param {String} nick
 * @param {String} chan
 * @param {String} name
 * @return {PluginControlPlugin} this
 * @api private
 */

PluginControlPlugin.prototype.$load = function(id, nick, chan, name) {
  if (this.bot.hasPlugin(name)) {
    this.error(chan, format("%s plugin is already loaded", name));
    return this;
  }

  var loaded = this.bot.loadPlugin(name);

  if (loaded) {
    var plugin = this.bot.getPlugin(name);
    this.bot.notice(id, chan, format("%s/%s loaded", plugin.name, plugin.version));
    return this;
  }

  this.bot.error(id, chan, format("%s plugin failed to load", name));

  return this;
};

/**
 * Unload a plugin with a given `name`.
 *
 * @param {String} id
 * @param {String} nick
 * @param {String} chan
 * @param {String} name
 * @return {PluginControlPlugin} this
 * @api private
 */

PluginControlPlugin.prototype.$unload = function(id, nick, chan, name) {
  if (!this.bot.hasPlugin(name)) {
    this.error(chan, format("%s plugin is not loaded", name));
    return this;
  }

  var plugin = this.bot.getPlugin(name);
  var pName = plugin.name;
  var pVersion = plugin.version;
  var unloaded = this.bot.unloadPlugin(name);

  if (unloaded) {
    this.bot.notice(id, chan, format("%s/%s unloaded", pName, pVersion));
    return this;
  }

  this.error(id, chan, format("%s plugin failed to unload", name));

  return this;
};

/**
 * Reload a plugin with a given `name`.
 *
 * If the plugin isn't currently loaded, it will be loaded.
 *
 * @param {String} id
 * @param {String} nick
 * @param {String} chan
 * @param {String} name
 * @return {PluginControlPlugin} this
 * @api private
 */

PluginControlPlugin.prototype.$reload = function(id, nick, chan, name) {
  if (!this.bot.hasPlugin(name)) {
    return this.$load(id, nick, chan, name);
  }

  var unloaded = this.bot.unloadPlugin(name);

  if (unloaded) {
    var loaded = this.bot.loadPlugin(name);

    if (loaded) {
      var plugin = this.bot.getPlugin(name);
      this.bot.notice(id, chan, format("%s/%s reloaded", plugin.name, plugin.version));
      return this;
    }
  }

  this.error(id, chan, format("%s plugin failed to reload", name));

  return this;
};

/**
 * Send error to `channel` as a notice.
 *
 * @param {String} id
 * @param {String} channel
 * @param {String} error
 * @param {Number} code - optional
 * @return {Bot} this
 * @api public
 */

PluginControlPlugin.prototype.error = function(id, channel, error, code) {
  var err = new Error(error);
  err.code = code || 500;
  this.bot.error(id, channel, err);

  return this;
};

/**
 * Expose `PluginControlPlugin`.
 */

module.exports = PluginControlPlugin;
