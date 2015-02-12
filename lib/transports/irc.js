/*!
 * Nullstar
 * Copyright(c) 2015 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

var inherits = require('util').inherits;
var IRCClient = require('irc').Client;
var Transport = require('../transport');
var debug = require('debug')('nullstar:transports:irc');
var ms = require('ms');
/**
 * Creates an instance of a `IRCTransport`.
 *
 * @constructor
 * @this {IRCTransport}
 * @param {Bot} bot
 * @api public
 */

function IRCTransport(bot) {
  Transport.call(this, bot);
  this.connection = new IRCClient(this.get('irc server', '127.0.0.1'), this.get('irc nick', 'nullstar'), {
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
}

/**
 * Inherit from `Transport`.
 */

inherits(IRCTransport, Transport);

/**
 * The IRCTransport name.
 */

IRCTransport.prototype.name = 'IRC Transport';

/**
 * The IRCTransport version.
 */

IRCTransport.prototype.version = '0.1';

/**
 * The Transport identifier.
 */

IRCTransport.prototype.id = 'irc';

/**
 * Connect to the IRC network and authenticate with NickServ if needed.
 *
 * @param {Function} fn
 * @return {Bot} this
 * @api public
 */

IRCTransport.prototype.connect = function(fn) {
  var irc = this.connection;

  irc.on('message#', function(from, channel, message) {
    this.bot.handle(this.id, from, channel, message);
  }.bind(this));
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
      this.say(nickservNick, 'identify ' + nickservPass);
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

IRCTransport.prototype.disconnect = function(message, fn) {
  this.connection.disconnect(message, fn);
  return this;
};

IRCTransport.prototype.notice = function(channel, msg) {
  this.connection.notice(channel, msg);
};

IRCTransport.prototype.say = function(channel, msg) {
  this.connection.say(channel, msg);
};

IRCTransport.prototype.users = function(channel) {
  var users;

  try {
    users = Object.keys(this.connection.chans[channel].users);
  } catch(e) {
  } finally {
    users = users || [];
  }

  return users;
};

/**
 * Expose `IRCTransport`.
 */

module.exports = IRCTransport;