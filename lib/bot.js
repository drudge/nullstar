/*!
 * Nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */


/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var Plugin = require('./plugin');
var Storage = require('./storage');
var domain = require('domain');
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

function Bot(opts) {
  EventEmitter.call(this);
  this.settings = opts || {};
  this.plugins = {};
  this.transports = {};
  this.startTime = new Date();
  this.storage = new Storage(this.get('database path', __dirname + '/../nullstar.db'));

  Object.keys(this.broadcast).forEach(function(name) {
    this.broadcast[name] = this.broadcast[name].bind(this);
  }, this);
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(Bot, EventEmitter);

/**
 * Connect to all configured transports.
 *
 * @param {Function} fn
 * @return {Bot} this
 * @api public
 */

Bot.prototype.connect = function(fn) {
  var ids = Object.keys(this.transports) || [];

  utils.forEach(ids, function(id, next) {
    var transport = this.transports[id];
    transport.connect(next);
  }.bind(this), fn);

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
  var ids = Object.keys(this.transports) || [];

  utils.forEach(ids, function(id, next) {
    var transport = this.transports[id];
    transport.disconnect(message, next);
  }.bind(this), fn);

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
 * @param {String} [def]
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
 * Load and initialize the transport with a given `name`.
 *
 * To load all plugins, specify the `*` wildcard.
 *
 * @param {String} name
 * @return {Bot} this
 * @api public
 */

Bot.prototype.transport = function(name) {
  if (name == '*') {
    var transports = readdirSync(__dirname + '/transports').filter(function(file) {
      return /\.js$/.test(file);
    });
    transports.forEach(function(pname) {
      this.loadTransport(pname.substr(0, pname.indexOf('.js')));
    }.bind(this));
  } else {
    this.loadTransport(name);
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

Bot.prototype.loadTransport = function(name) {
  var T;
  var transport;

  debug('loading transport: %s', name);

  try {
    T = require(__dirname + '/transports/' + name);
    transport = new T(this);
  } catch (e) {
    debug('error loading transport %s: %s', name, e.message);
    T = null;
    transport = null;
  } finally {
    if (transport) {
      this.transports[transport.id] = transport;
      this.emit('load transport', transport);
      return true;
    }
  }

  return false;
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

Bot.prototype.handle = function(id, from, channel, message) {
  var handled = false;

  this.emit('message', from, channel, message);

  utils.forEach(Object.keys(this.plugins || {}), function(name, next) {
    var plugin = this.plugins[name];
    if (!plugin instanceof Plugin) {
      return next();
    }

    var d = domain.create();
    d.on('error', function(err) {
      debug('%s/%s: error handling: %s', plugin.name, plugin.version, err.message);
      console.error(err.stack);
    });
    d.run(function() {
      debug('calling handle on %s', plugin.name);
      handled = plugin.handle(id, from, channel, message);
      next();
    });
  }.bind(this), done);

  function done() {
    if (!handled) {
      debug('unhandled message: [%s] <%s/%s> %s', id, from, channel, message);
    }
  }

  return handled;
};

/**
 * Send error to `channel` as a notice.
 *
 * @param {String} id
 * @param {String} channel
 * @param {Object} data
 * @return {Bot} this
 * @api public
 */

Bot.prototype.error = function(id, channel, error) {
  var msg = format('Error: %s (%s)', error.message, error.code);
  debug(msg);
  this.notice(id, channel, msg);

  return this;
};

Bot.prototype.notice = function(id, channel, msg) {
  var transport = this.transports[id];

  if (transport) {
    debug('[%s] noticing to %s: %s', id, channel, msg);
    transport.notice(channel, msg);
  }

  return this;
};

Bot.prototype.say = function(id, channel, msg) {
  var transport = this.transports[id];

  if (transport) {
    debug('[%s] saying to %s: %s', id, channel, msg);
    transport.say(channel, msg);
  }

  return this;
};

Bot.prototype.broadcast = {};

Bot.prototype.broadcast.notice = function(channel, msg) {
  (Object.keys(this.transports) || []).forEach(function(id) {
    this.notice(id, channel, msg);
  }, this);

  return this;
};

Bot.prototype.broadcast.say = function(channel, msg) {
  (Object.keys(this.transports) || []).forEach(function(id) {
    this.say(id, channel, msg);
  }, this);

  return this;
};

/**
 * Expose Bot.
 */

module.exports = exports = Bot;