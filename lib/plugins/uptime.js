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
var debug = require('debug')('nullstar:plugin:uptime');

/**
 * Creates an instance of a `UptimePlugin`.
 *
 * @constructor
 * @this {UptimePlugin}
 * @param {Bot} bot
 * @api public
 */

function UptimePlugin(bot) {
  Plugin.call(this, bot);
}

/**
 * Inherit from `Plugin`.
 */

inherits(UptimePlugin, Plugin);

/**
 * The plugin name.
 */

UptimePlugin.prototype.name = 'Uptime Plugin';

/**
 * The plugin version.
 */

UptimePlugin.prototype.version = '1.0';

/**
 * Post current bot uptime.
 *
 * @param {String} nick
 * @param {String} chan
 * @return {UptimePlugin} this
 * @api private
 */

UptimePlugin.prototype.$uptime = function(nick, chan) {
  var uptime = [];
  var current = new Date();
  var currentDiff = current.getTime() - this.bot.startTime.getTime();
  var diff = new Object();

  diff.days = Math.floor(currentDiff / 1000 / 60 / 60 / 24);
  currentDiff -= diff.days * 1000 * 60 * 60 * 24;

  diff.hours = Math.floor(currentDiff / 1000 / 60 / 60);
  currentDiff -= diff.hours * 1000 * 60 * 60;

  diff.minutes = Math.floor(currentDiff / 1000 / 60);
  currentDiff -= diff.minutes * 1000 * 60;

  diff.seconds = Math.floor(currentDiff / 1000);

  if (diff.days >= 1) {
    uptime.push(diff.days + ' day' + ((diff.days > 1) ? 's' : ''));
  }

  if (diff.hours >= 1) {
    uptime.push(diff.hours + ' hour' + ((diff.hours > 1) ? 's' : ''));
  }

  if (diff.minutes >= 1) {
    uptime.push(diff.minutes + ' minute' + ((diff.minutes > 1) ? 's' : ''));
  }

  if (diff.seconds >= 1) {
    uptime.push(diff.seconds + ' second' + ((diff.seconds > 1) ? 's' : ''));
  }

  uptime = uptime.join(', ');
  
  debug('uptime %s', uptime);

  this.bot.notice(chan, format('Uptime: %s', uptime));

  return this;
};


/**
 * Say something stupid.. because threeve.
 *
 * @param {String} nick
 * @param {String} chan
 * @return {UptimePlugin} this
 * @api private
 */

UptimePlugin.prototype.$downtime = function(nick, chan) {
  this.bot.say(chan, format('%s: Your mom.', nick));
};

/**
 * Say something stupid.. because threeve.
 *
 * @param {String} nick
 * @param {String} chan
 * @return {UptimePlugin} this
 * @api private
 */

UptimePlugin.prototype.$peanutbutterjellytime = function(nick, chan) {
  this.bot.say(chan, format('%s: http://www.youtube.com/watch?v=s8MDNFaGfT4', nick));
};

/**
 * Expose `UptimePlugin`.
 */

module.exports = UptimePlugin;
