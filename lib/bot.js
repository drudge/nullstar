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
var readdirSync = require('fs').readdirSync;
var debug = require('debug')('nullstar');
var utils = require('./utils');

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
  this.plugins = {};
  this.connection = null;
  this.startTime = new Date();
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

  var irc = this.connection = new IrcClient(self.get('irc server', '127.0.0.1'), self.get('irc nick', 'nullstar'), {
    channels: self.get('irc channels', ['#nullstar']),
    userName: self.get('irc username', 'nullstar'),
    realName: self.get('irc name', 'nullstar'),
    port: self.get('irc port', 6667),
    secure: self.get('irc use ssl', false),
    sasl: self.get('irc use sasl', false),
    autoRejoin: self.get('irc enable autorejoin', true),
    autoConnect: false,
    floodProtection: self.get('irc enable flood protection', true),
    floodProtectionDelay: self.get('irc flood protection delay', 1000),
    channelPrefixes: self.get('irc channel prefixes', '&#'),
    password: self.get('irc nickserv password')
  });

  // forward common irc commands to the connection so we can use bot.cmd() instead
  utils.forward(this, this.connection, [
    'send',
    'say',
    'notice',
    'action',
    'disconnect',
    'connect',
    'join',
    'part',
    'ctcp',
    'whois',
    'list'
  ]);

  irc.on('message#', self.handle.bind(self));
  irc.on('error', function(err) {
    console.error(err);
    debug('error: %s', err.command);
    //self.emit('error', message);
  });

  debug('connecting to ' + self.get('irc server') + ':' + self.get('irc port'));
  irc.connect(self.get('irc connect attempts', 5));
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

Bot.prototype.get = function(key, def) {
  var val = this.settings[key];
  return typeof val !== 'undefined' ? val : def;
};

/**
 * Load and initialize the plugin with a given `name`.
 *
 * To load all plugins, specify the `*` wildcard.
 *
 * @param {String} name
 * @return {Bot} this
 * @api public
 */

Bot.prototype.plugin = function(name) {
  var self = this;
  var P, plugin;

  if (name == '*') {
    var plugins = readdirSync(__dirname + '/plugins').filter(function(file) {
      return /\.js$/.test(file);
    });
    plugins.forEach(function(pname) {
      self.loadPlugin(pname.substr(0, pname.indexOf('.js')));
    });
  } else {
    self.loadPlugin(name);
  }

  return this;
};

/**
 * Load a plugin with a given `name`.
 *
 * @param {String} name
 * @return {Bot} this
 * @api public
 */

Bot.prototype.loadPlugin = function(name) {
  var pName = utils.sanitize(name);

  debug('loading plugin: %s', name);

  try {
    P = require(__dirname + '/plugins/' + name);
    plugin = new P(this);
  } catch (e) {
    debug('error loading plugin %s: %s', name, e.message);
  } finally {
    if (plugin) {
      plugin.cache();
      this.plugins[pName] = plugin;
    }
  }

  return this;
};

Bot.prototype.unloadPlugin = function(name) {
  var pName = utils.sanitize(name);

  debug('unloading plugin: %s', name);

  this.removeAllListeners(this.plugins[pName]);
  delete this.plugins[pName];
  delete require.cache[__dirname + '/plugins/' + name + '.js'];

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
  var handled = false;

  for(name in this.plugins) {
    var plugin = this.plugins[name];
    if (plugin instanceof Plugin) {
      debug('calling handle on %s', plugin.name);
      var ret = plugin.handle(from, channel, message);
      if (ret) handled = true;
    }
  }

  if (!handled) {
    debug('unhandled message: <%s/%s> %s', from, channel, message);
  }
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
  this.notice(channel, msg);

  return this;
};

/**
 * Expose Bot.
 */

module.exports = exports = Bot;
