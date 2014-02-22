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
  
  bot.db.createTable('karma', {
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

KarmaPlugin.POSSIBLE_NICK_PREFIXES = [ '+', '@', '%', '~' ];

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

KarmaPlugin.prototype.version = '0.2.0';

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
  var self = this;
  var matches = message.match(/([^: ]+):?\s?[+-]([+-]+)\s*$/);
  
  if (matches && matches.length >= 3) {
    var nick = matches[1].toLowerCase();
    var action = matches[2];
    var users = Object.keys(self.bot.connection.chans[channel].users).map(function(sNick) {
      return sNick.trim().toLowerCase();
    });
    
    if (users.indexOf(nick) !== -1) {
      if (from == nick) {
        this.bot.notice(channel, 'Error: You can not alter your own karma, douche.');
      } else {
        debug('karma change: %s %s', nick, action);
        this.persistChange(nick, action == '-' ? -1 : 1, function(newVal) {
          self.bot.notice(channel, format('%s now has %s karma point%s', nick, newVal, newVal == 1 ? '' : 's'));
        });
      }
    } else {
      debug('unknown nick %s, skipping', nick);
    }
    
    return true;
  }
  
  return KarmaPlugin.super_.prototype.handle.call(this, from, channel, message);
};

KarmaPlugin.prototype.persistChange = function(nick, val, fn) {
  var db = this.bot.db;
  
  debug('persist change for %s: %s', nick, val);
  
  db.selectOne('karma', null, ['id', 'value'], 'nick = ?', [nick], function(err, row) {
    if (err) console.log(err);
    if (!row) {
      db.insert('karma', { nick: nick, value: val, last_updated: Date.now() }, function(err) {
        if (err) console.error(err);
        fn(val);
      });
    } else {
      var newVal = (row.value + val);
      db.updateById('karma', row.id, { value: newVal, last_updated: Date.now() }, function(err) {
        if (err) console.error(err);
        fn(newVal);
      });
    }
  });
};

KarmaPlugin.prototype.$karma = function(from, channel, nick) {
  var self = this;
  var db = this.bot.db;
  nick = (nick || '').trim().toLowerCase();
  
  debug('getting karma for %s', nick);
  
  db.selectOne('karma', null, ['value'], 'nick = ?', [nick], function(err, user) {
    var msg = format('Error: Unknown user \'%s\'', nick);
    var pts = user ? user.value : 0;
    var users = Object.keys(self.bot.connection.chans[channel].users).map(function(sNick) {
      return sNick.trim().toLowerCase();
    });
    
    if (users.indexOf(nick) !== -1) {
      msg = format('%s has %s karma point%s', nick, pts, pts === 1 ? '' : 's');
    }
    
    debug(msg);
    
    self.bot.notice(channel, msg);
  });
};

/**
 * Expose `KarmaPlugin`.
 */

module.exports = KarmaPlugin;
