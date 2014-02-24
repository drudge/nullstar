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
var Storage = require('./storage');
var inherits = require('util').inherits;
var format = require('util').format;
var readdirSync = require('fs').readdirSync;
var debug = require('debug')('nullstar');
var utils = require('./utils');
var ms = require('ms');

/**
 * Creates an instance of a `Bot`.
 *
 * @constructor
 * @this {Bot}
 * @api public
 */

function Bot(opts) {
  EventEmitter.call(this);
  this.settings = opts || {};
  this.plugins = {};
  this.startTime = new Date();
  this.storage = new Storage(this.get('database path', __dirname + '/../nullstar.db'));
  this.connection = this.makeClient();
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(Bot, EventEmitter);

/**
 * Return a new instance of `irc.Client` using the bot's `settings`.
 *
 * @return {irc.Client}
 * @api public
 */

Bot.prototype.makeClient = function() {
  return new IrcClient(this.get('irc server', '127.0.0.1'), this.get('irc nick', 'nullstar'), {
    debug: this.get('irc enable debug', false),
    
    channels: this.get('irc channels', ['#nullstar']),
    userName: this.get('irc username', 'nullstar'),
    realName: this.get('irc name', 'nullstar'),
    port: this.get('irc port', 6667),
    secure: this.get('irc use ssl', false),
    sasl: this.get('irc use sasl', false),
    autoRejoin: this.get('irc enable autorejoin', true),
    autoConnect: false,
    selfSigned: this.get('irc ssl accept self signed certs', false),
    certExpired: this.get('rc ssl accept expired certs', false),
    floodProtection: this.get('irc enable flood protection', false),
    floodProtectionDelay: ms(this.get('irc flood protection delay', "1s")),
    channelPrefixes: this.get('irc channel prefixes', '&#'),
    password: this.get('irc nickserv password'),
    messageSplit: this.get('irc message split size', 512),
    stripColors: this.get('irc strip colors', false),
    retryCount: this.get('irc connect attempts', 5),
    retryDelay: ms(this.get('irc connect attempt delay', "2s"))
  });
};

/**
 * Connect to the IRC network and authenticate with NickServ if needed.
 *
 * @param {Function} fn
 * @return {Bot} this
 * @api public
 */

Bot.prototype.connect = function(fn) {
  var irc = this.connection || this.makeClient();
  
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
  
  irc.on('message#', this.handle.bind(this));
  irc.on('error', function(err) {
    console.error(err);
    debug('error: %s', err.command);
    //self.emit('error', message);
  }.bind(this));
  irc.on('registered', function(motd) {
    debug('connected.');
    this.emit('connect', motd);
    debug('motd: %s', motd.args.join('\n'));
    var nickservPass = this.get('irc nickserv password');
    var nickservNick = this.get('irc nickserv nick', 'NickServ');
    if (!this.get('irc use sasl') && nickservPass) {
      debug('identifying with %s', nickservNick);
      irc.say(nickservNick, 'identify ' + nickservPass);
      this.emit('identify');
    }
    if ('function' == typeof fn) fn();
  }.bind(this));
  
  debug('connecting to %s:%s', irc.opt.server, irc.opt.port);
  irc.connect();
  
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
  if (name == '*') {
    var plugins = readdirSync(__dirname + '/plugins').filter(function(file) {
      return /\.js$/.test(file);
    });
    plugins.forEach(function(pname) {
      this.loadPlugin(pname.substr(0, pname.indexOf('.js')));
    }.bind(this));
  } else {
    this.loadPlugin(name);
  }
  
  return this;
};

/**
 * Load a plugin with a given `name`.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

Bot.prototype.loadPlugin = function(name) {
  var P, plugin;
  var pName = utils.sanitize(name);
  
  debug('loading plugin: %s', name);
  
  try {
    P = require(__dirname + '/plugins/' + name);
    plugin = new P(this);
  } catch (e) {
    debug('error loading plugin %s: %s', name, e.message);
    P = null;
    plugin = null;
  } finally {
    if (plugin) {
      plugin.cache();
      this.plugins[pName] = plugin;
      this.emit('load plugin', plugin);
      return true;
    }
  }
  
  return false;
};

/**
 * Unload a plugin with a given `name`.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

Bot.prototype.unloadPlugin = function(name) {
  var pName = utils.sanitize(name);
  
  if (!this.hasPlugin(name)) {
    return false;
  }
  
  debug('unloading plugin: %s', name);
  
  this.emit('unload plugin', this.plugins[pName]);
  this.connection.removeAllListeners(this.plugins[pName]);
  this.removeAllListeners(this.plugins[pName]);
  delete this.plugins[pName];
  delete require.cache[__dirname + '/plugins/' + name + '.js'];
  
  return true;
};

/**
 * Returns true if plugin with a given `name` is currently loaded.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

Bot.prototype.hasPlugin = function(name) {
  return (typeof this.plugins[utils.sanitize(name)] !== 'undefined');
};

/**
 * Returns instance of plugin with a given `name`, if currently loaded.
 *
 * @param {String} name
 * @return {Plugin}
 * @api public
 */

Bot.prototype.getPlugin = function(name) {
  return this.plugins[utils.sanitize(name)];
};

/**
 * Handle an incoming message, processing and executing a command if found.
 *
 * @param {String} from
 * @param {String} channel
 * @param {String} message
 * @return {Boolean}
 * @api public
 */

Bot.prototype.handle = function(from, channel, message) {
  var handled = false;
  
  this.emit('message', from, channel, message);
  
  for(var name in this.plugins) {
    if (this.plugins.hasOwnProperty(name)) {
      var plugin = this.plugins[name];
      if (plugin instanceof Plugin) {
        debug('calling handle on %s', plugin.name);
        var ret = plugin.handle(from, channel, message);
        if (ret) handled = true;
      }
    }
  }
  
  if (!handled) {
    debug('unhandled message: <%s/%s> %s', from, channel, message);
  }
  
  return handled;
};

/**
 * Send error to `channel` as a notice.
 *
 * @param {String} channel
 * @param {Object} data
 * @return {Bot} this
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
