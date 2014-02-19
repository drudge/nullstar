/*!
 * Nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */


/**
 * Module dependencies.
 */

var IrcClient = require('irc').Client;
var EventEmitter = require('events').EventEmitter;
var Plugin = require('./plugin');
var inherits = require('util').inherits;
var format = require('util').format;
var debug = require('debug')('nullstar');

/**
 * Creates an instance of a `Bot`.
 *
 * @constructor
 * @this {Bot}
 * @api public
 */

function Bot() {
  EventEmitter.call(this);
  this.settings = {};
  this.plugins = [];
  this.connection = null;
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(Bot, EventEmitter);

/**
 * Connect to the IRC network and authenticate with NickServ if needed.
 *
 * @param {Function} fn
 * @return {Bot} this
 * @api public
 */

Bot.prototype.connect = function(fn) {
  var self = this;
  
  var irc = this.connection = new IrcClient(self.get('irc server'), self.get('irc nick'), {
    channels: self.get('irc channels'),
    userName: self.get('irc username'),
    realName: self.get('irc name'),
    port: self.get('irc port'),
    secure: self.get('irc use ssl'),
    sasl: self.get('irc use sasl'),
    autoRejoin: true,
    autoConnect: false,
    floodProtection: true,
    floodProtectionDelay: 1000,
    channelPrefixes: '&#',
    password: self.get('irc nickserv password')
  });
  
  irc.on('message#', self.handle.bind(self));
  irc.on('error', function(message) {
      self.emit('error', message);
  });
  
  debug('connecting to ' + self.get('irc server') + ':' + self.get('irc port'));
  irc.connect(5);
  irc.on('registered', function() {
    debug('connected.');
    var nickservPass = self.get('irc nickserv password');
    var nickservNick = self.get('irc nickserv nick') || 'NickServ';
    if (!self.get('irc use sasl') && nickservPass) {
      debug('identifying with %s', nickservNick);
      irc.say(nickservNick, 'identify ' + nickservPass);
    }
    if ('function' == typeof fn) fn();
  });
  
  return this;
};

/**
 * Disconnect from the IRC network with optional `message`.
 *
 * @param {String} message
 * @param {Function} fn
 * @return {Bot} this
 * @api public
 */

Bot.prototype.disconnect = function(message, fn) {
  this.connection.disconnect(message, fn);
  return this;
};

/**
 * Set a configuration value or values for the bot.
 *
 * @param {String|Object} message
 * @param {Mixed} val
 * @return {Bot} this
 * @api public
 */

Bot.prototype.set = function(key, val) {
  if ('object' == typeof key) {
    this.settings = key;
  } else {
    this.settings[key] = val;
  }
  
  return this;
};

/**
 * Retreive a configuration value for a given `key`.
 *
 * @param {String} key
 * @return {Mixed}
 * @api public
 */

Bot.prototype.get = function(key) {
  return this.settings[key];
};

/**
 * Load a plugin with a given `name`.
 *
 * @param {String} name
 * @return {Bot} this
 * @api public
 */

Bot.prototype.plugin = function(name) {
  var P, plugin;
  
  try {
    P = require('./plugins/' + name);
    plugin = new P(this);
  } catch (e) {
    debug('error loading plugin %s: %s', name, e.message);
  } finally {
    if (plugin) {
      plugin.cache();
      this.plugins.push(plugin);
    }
  }
  
  return this;
};

/**
 * Handle an incoming message, processing and executing a command if found.
 *
 * @param {String} from
 * @param {String} channel
 * @param {String} message
 * @return {Bot} this
 * @api public
 */

Bot.prototype.handle = function(from, channel, message) {
  (this.plugins || []).forEach(function(plugin) {
    if (plugin instanceof Plugin) {
      plugin.handle(from, channel, message);
    }
  });
};

/**
 * Send Twitter webservice error to `channel` as a notice.
 *
 * @param {String} channel
 * @param {Object} data
 * @return {TweetPlugin} this
 * @api public
 */

Bot.prototype.error = function(channel, error) {
  var msg = format('Error: %s (%s)', error.message, error.code);
  debug(msg);
  this.connection.notice(channel, msg);
  
  return this;
};

/**
 * Expose Bot.
 */

module.exports = exports = Bot;