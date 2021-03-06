/*!
 * Nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('nullstar:plugin');
var utils = require('./utils');

/**
 * Creates an instance of a `Plugin`.
 *
 * @constructor
 * @this {Plugin}
 * @param {Bot} bot
 * @api public
 */

function Plugin(bot) {
  EventEmitter.call(this);
  this.bot = bot;
  this._commands = [];

  utils.forward(this, this.bot, [ 'get', 'set' ]);
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(Plugin, EventEmitter);

/**
 * The plugin name.
 */

Plugin.prototype.name = 'Plugin';

/**
 * The plugin version.
 */

Plugin.prototype.version = '0.9';

/**
 * Handle an incoming message, processing and executing a command if found.
 *
 * @param {String} id
 * @param {String} from
 * @param {String} channel
 * @param {String} message
 * @return {Boolean}
 * @api public
 */

Plugin.prototype.handle = function(id, from, channel, message) {
  if (!this._commands.length) {
    this.cache();
  }

  var re = new RegExp('^' + this.get('trigger') + '(' + this._commands.join('|') + ')(?:\\s(.*))?$');
  var matches = re.exec(message);

  //debug('regexp: %s', restr);

  if (matches && matches.length >= 2) {
    var cmd = matches[1];
    var args = matches[2];

    debug('%s/%s: calling $%s(%s, %s, %s, %s)', this.name, this.version, cmd, id, from, channel, args);

    //if(this.get('irc channels', ['#nullstar']).indexOf(channel) !== -1) {
    this.emit('handle', id, cmd, from, args);
    if (typeof this['$' + cmd] === 'function') {
      this['$' + cmd].call(this, id, from, channel, args);
      return true;
    }
  }

  return false;
};

/**
 * Cache all command names handled by the plugin.
 *
 * @return {Plugin} this
 * @api public
 */

Plugin.prototype.cache = function() {
  this._commands = [];
  var prototype = Object.getPrototypeOf(this);

  for (var key in prototype) {
    if (prototype.hasOwnProperty(key) && key.indexOf('$') === 0) {
        this._commands.push(key.substr(1));
    }
  }

  debug('[%s/%s] supported commands: %s', this.name, this.version, this._commands.join(', '));

  return this;
};

/**
 * Expose `Plugin`.
 */

module.exports = Plugin;