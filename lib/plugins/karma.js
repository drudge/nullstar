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
var debug = require('debug')('nullstar:plugin:karma');

/**
 * Creates an instance of a `KarmaPlugin`.
 *
 * @constructor
 * @this {KarmaPlugin}
 * @param {Bot} bot
 * @api public
 */

function KarmaPlugin(bot) {
  Plugin.call(this, bot);
  this.collectionName = 'karma';
  
  bot.storage.createCollection(this.collectionName, {
    'id': {
       type: 'INTEGER',
       primary: true,
       autoincrement: true
     },
     'nick': {
       type: 'TEXT',
       notnull: true,
       true: false,
     },
     'value': {
       type: 'INTEGER',
       notnull: true,
       unique: false,
     },
     'last_updated': {
       type: 'INTEGER',
       notnull: true,
     }
  }, function(err) {
    if (err) throw err;
  });
}

/**
 * Inherit from `Plugin`.
 */

inherits(KarmaPlugin, Plugin);

/**
 * The plugin name.
 */

KarmaPlugin.prototype.name = 'Karma Plugin';

/**
 * The plugin version.
 */

KarmaPlugin.prototype.version = '0.9.0';

/**
 * Get a list of nicknames for a given `channel`. The nicknames will be in lower-case.
 *
 * @param {String} channel
 * @return {Array}
 * @api private
 */

KarmaPlugin.prototype._getUsersForChannel = function(channel) {
  var users;
  
  try {
    users = Object.keys(this.bot.connection.chans[channel].users);
  } catch(e) {
  } finally {
    users = users || [];
  }
  
  return users.map(function(nick) {
    return (nick || '').trim().toLowerCase();
  });
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

KarmaPlugin.prototype.handle = function(from, channel, message) {
  var matches = message.match(/([^: ]+):?\s?[+-]([+-]+)\s*$/);

  
  if (matches && matches.length >= 3) {
    var nick = matches[1].toLowerCase();
    var action = matches[2];
    var users = this._getUsersForChannel(channel);
    
    if (users.indexOf(nick) !== -1) {
      if (from == nick) {
        this.bot.notice(channel, 'Error: You can not alter your own karma, douche.');
      } else {
        debug('karma change: %s %s', nick, action);
        this.store(nick, action == '-' ? -1 : 1, function(newVal) {
          this.bot.notice(channel, format('%s now has %s karma point%s', nick, newVal, newVal == 1 ? '' : 's'));
        }.bind(this));
      }
    } else {
      debug('unknown nick %s, skipping', nick);
    }
    
    return true;
  }
  
  return KarmaPlugin.super_.prototype.handle.call(this, from, channel, message);
};

/**
 * Store karma score for given `nick`.
 *
 * @param {String} nick
 * @param {Number} score
 * @param {Function} fn
 * @api public
 */

KarmaPlugin.prototype.store = function(nick, score, fn) {
  var storage = this.bot.storage;
  
  debug('saving %s: %s', nick, score);
  
  storage.fetchOne(this.collectionName, null, ['id', 'value'], 'nick = ?', [nick], function(err, item) {
    if (err) console.log(err);
    if (!item) {
      storage.put(this.collectionName, { nick: nick, value: score, last_updated: Date.now() }, function(err) {
        if (err) console.error(err);
        fn(score);
      });
    } else {
      var newVal = (item.value + score);
      storage.updateById(this.collectionName, { id: item.id, value: newVal, last_updated: Date.now() }, function(err) {
        if (err) console.error(err);
        fn(newVal);
      });
    }
  }.bind(this));
};

/**
 * Retreive a karma score for a given user.
 *
 * If no `nick` is specified, the user who called the command will be used.
 *
 * @param {String} from
 * @param {String} channel
 * @param {String} nick - optional
 * @api public
 */

KarmaPlugin.prototype.$karma = function(from, channel, nick) {
  var storage = this.bot.storage;
  nick = (nick || '').trim().toLowerCase();
  
  if (!nick) nick = from;
  
  debug('getting karma for %s', nick);
  
  storage.fetchOne(this.collectionName, null, ['value'], 'nick = ?', [nick], function(err, user) {
    var users = this._getUsersForChannel(channel);
    var msg = format('Error: Unknown user \'%s\'', nick);
    var pts = user ? user.value : 0;
    
    if (users.indexOf(nick) !== -1) {
      msg = format('%s has %s karma point%s', nick, pts, pts === 1 ? '' : 's');
    }
    
    debug(msg);
    
    this.bot.notice(channel, msg);
  }.bind(this));
};

/**
 * Expose `KarmaPlugin`.
 */

module.exports = KarmaPlugin;
