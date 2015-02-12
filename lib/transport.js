/*!
 * Nullstar
 * Copyright(c) 2015 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('nullstar:transport');
var utils = require('./utils');

/**
 * Creates an instance of a `Transport`.
 *
 * @constructor
 * @this {Transport}
 * @param {Bot} bot
 * @api public
 */

function Transport(bot) {
  EventEmitter.call(this);
  this.bot = bot;
  utils.forward(this, this.bot, [ 'get', 'set' ]);
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(Transport, EventEmitter);

/**
 * The Transport name.
 */

Transport.prototype.name = 'Transport';

/**
 * The Transport version.
 */

Transport.prototype.version = '0.1';

/**
 * The Transport identifier.
 */

Transport.prototype.id = 'unknown';

/**
 * Connect to the transport, performing any authentication needed.
 *
 * @param {Function} fn
 * @return {Transport} this
 * @api public
 */

Transport.prototype.connect = function(fn) {
  throw new Error('Transport needs to be subclassed');
};

Transport.prototype.disconnect = function(msg, fn) {
  throw new Error('Transport needs to be subclassed');
};

Transport.prototype.notice = function(channel, msg) {
  throw new Error('Transport needs to be subclassed');
};

Transport.prototype.say = function(channel, msg) {
  throw new Error('Transport needs to be subclassed');
};

Transport.prototype.users = function(channel) {
  throw new Error('Transport needs to be subclassed');
};

/**
 * Expose `Transport`.
 */

module.exports = Transport;