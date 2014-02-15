/*!
 * nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var IrcClient = require('irc').Client;
var EventEmitter = require('events').EventEmitter;
var Twitter = require('twitter');
var inherits = require('util').inherits;
var format = require('util').format;
var debug = require('debug')('nullstarbot');

function NullstarBot() {
  var self = this;
  EventEmitter.call(this);
  this.settings = {};
  this.connection = null;
  this.twitter = null;
}

/**
 * Inherit from EventEmitter.
 */

inherits(NullstarBot, EventEmitter);

/**
 * Connect to the IRC network and authenticate with NickServ if needed.
 *
 * @param {Function} fn
 * @return {NullstarBot} this
 * @api public
 */

NullstarBot.prototype.connect = function(fn) {
  var self = this;
  var twitter = this.twitter = new Twitter({
    consumer_key: self.get('twitter consumer key'),
    consumer_secret: self.get('twitter consumer secret'),
    access_token_key: self.get('twitter access token'),
    access_token_secret: self.get('twitter access token secret')
  });
  
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
 * @return {NullstarBot} this
 * @api public
 */

NullstarBot.prototype.disconnect = function(message, fn) {
  this.connection.disconnect(message, fn);
  return this;
};

/**
 * Set a configuration value or values for the bot.
 *
 * @param {String|Object} message
 * @param {Mixed} val
 * @return {NullstarBot} this
 * @api public
 */

NullstarBot.prototype.set = function(key, val) {
  if ('object' == typeof key) {
    this.settings = key;
    console.log(this.settings);
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

NullstarBot.prototype.get = function(key) {
  return this.settings[key];
};


/**
 * Handle an incoming message, processing and executing a command if found.
 *
 * @param {String} from
 * @param {String} channel
 * @param {String} message
 * @return {NullstarBot} this
 * @api public
 */

NullstarBot.prototype.handle = function(from, channel, message) {
  var self = this;
  var commands = [];
  
  for (var key in NullstarBot.prototype) {
    if (NullstarBot.prototype.hasOwnProperty(key) && key.indexOf('_') === 0 && key !== '_handle') {
        commands.push(key.substr(1));
    }
  }
  
  debug('supported commands: ' + commands.join(', '));
  
  var re = new RegExp('^' + self.get('trigger') + '(' + commands.join('|') + ')\\s(.*)$');
  var matches = re.exec(message);
  
  if (matches && matches.length >= 3) {
    var cmd = matches[1];
    var args = matches[2];
    
    if(self.get('irc channels').indexOf(channel) !== -1) {
      debug('calling _%s: %s, %s, %s', cmd, from, channel, args);
      self['_' + cmd].call(self, from, channel, args);
    }
  }
  
  return this;
};

/**
 * Post `status` as a tweet.
 *
 * @param {String} nick
 * @param {String} chan
 * @param {String} status
 * @return {NullstarBot} this
 * @api private
 */

NullstarBot.prototype._tweet = function(nick, chan, status) {
  var self = this;
  status = (status || '').trim();
  
  if (status.length) {
    debug('tweeting \'%s\'', status);
    self.twitter.updateStatus(status, function(data) {
      if (data.id_str) {
        self.connection.notice(chan, format('https://twitter.com/%s/status/%s', data.user.screen_name, data.id_str));
      } else {
        self.error(chan, data);
      }
    });
  }
  
  return this;
};

/**
 * Remove a tweet using the `id` or url.
 *
 * @param {String} nick
 * @param {String} chan
 * @param {String} id/url
 * @return {NullstarBot} this
 * @api private
 */

NullstarBot.prototype._rmtweet = function(nick, chan, id) {
  var self = this;
  
  if (id.length) {
    var matches = id.match(/https?:\/\/twitter\.com\/.*\/status\/([0-9]+)/);
    
    if (matches && matches.length >= 2) {
      id = matches[1];
    }
    
    debug('deleting tweet id \'%s\'', id);
    self.twitter.destroyStatus(id, function(data) {
      if (data.id_str) {
        self.connection.notice(chan, format('Tweet deleted (%s)', id));
      } else {
        self.error(chan, data);
      }
    });
  }
  
  return this;
};

/**
 * Send Twitter webservice error to `channel` as a notice.
 *
 * @param {String} channel
 * @param {Object} data
 * @return {NullstarBot} this
 * @api public
 */

NullstarBot.prototype.error = function(channel, data) {
  data = data || {};
  
  var self = this;
  var errors;
  
  try {
    var tmp = JSON.parse(data.data);
    errors = tmp.errors;
  } catch (e) {}
  
  if (errors && errors.length) {
    if (errors.length >= 1) {
      var error = errors[0];
      var str = format('Error: %s (%s)', error.message, error.code);
      debug(str);
      self.connection.notice(channel, str);
    }
  }
  
  return this;
};

/**
 * Expose NullstarBot.
 */

module.exports = exports = NullstarBot;