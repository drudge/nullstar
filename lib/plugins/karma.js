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

KarmaPlugin.prototype.names = function(channel) {
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
 * Handle an incoming message, and apply karma adjustment if needed.
 *
 * @param {String} from
 * @param {String} channel
 * @param {String} message
 * @return {Boolean}
 * @api public
 */

KarmaPlugin.prototype.handle = function(from, channel, message) {
  var matches = message.match(/([^: ]+):?\s?[+-][+-]*([+-])\s*$/);
  
  // karma change detected
  if (matches && matches.length >= 3) {
    var nick = matches[1].toLowerCase();
    var action = matches[2];
    var nicks = this.names(channel);
    
    if (~nicks.indexOf(nick)) {
      if (from.toLowerCase() == nick) {
        var err = new Error('You can not alter your own karma, douche.');
        err.code = 403;
        this.bot.error(channel, err);
      } else {
        debug('detected karma change for %s: %s', nick, action == '-' ? 'down' : 'up');
        this.store(nick, action == '-' ? -1 : 1, function(score) {
          var msg = format('%s now has %s karma point%s', nick, score, score == 1 ? '' : 's');
          debug(msg);
          this.bot.notice(channel, msg);
        }.bind(this));
      }
    } else {
      debug('unknown nick %s, skipping', nick);
    }
    
    return true;
  }
  
  // handle plugin commands
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
  
  storage.fetchOne(this.collectionName, null, ['id', 'value'], 'nick = ?', [nick], function(err, item) {
    if (err) console.log(err);
    if (!item) {
      item = { nick: nick, value: score, last_updated: Date.now() };
      debug('storing %s: %s', nick, item.value);
      storage.put(this.collectionName, item, function(err) {
        if (err) console.error(err);
        fn(score);
      });
    } else {
     item.value += score;
     item.last_updated = Date.now();
     debug('storing %s: %s', nick, item.value);
      storage.updateById(this.collectionName, item, function(err) {
        if (err) console.error(err);
        fn(item.value);
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
  if (nick == 'stats') return this.stats(from, channel);
  
  debug('getting karma for %s', nick);
  
  storage.fetchOne(this.collectionName, null, ['value'], 'nick = ?', [nick], function(err, karma) {
    var msg = format('Error: Unknown user \'%s\'', nick);
    var pts = karma ? karma.value : 0;
    var nicks = this.names(channel);
    
    if (~nicks.indexOf(nick)) {
      msg = format('%s has %s karma point%s', nick, pts, pts === 1 ? '' : 's');
    }
    
    debug(msg);
    
    this.bot.notice(channel, msg);
  }.bind(this));
};

/**
 * Write out the current karma stats to the given `channel`.
 *
 * @param {String} from
 * @param {String} channel
 * @return {Bot}
 * @api public
 */

KarmaPlugin.prototype.stats = function(from, channel) {
  this.bot.storage.fetch(this.collectionName, null, null, '1', [], function(err, users) {
    users = users || [];
    if (users.length >= 3) {
      var tmp = users.filter(function(user, index) {
        return index < 3;
      }).map(function(user, index) {
        return format('%s (%s)', user.nick, user.value);
      });
      
      var msg = format('top 3: %s', tmp.join(' | '));
      
      debug(msg);
      
      this.bot.notice(channel, msg);
    }
    if (users.length >= 6) {
      var end = users.length - 3;
      var tmp = users.filter(function(user, index) {
        return index >= end;
      }).map(function(user, index) {
        return format('%s (%s)', user.nick, user.value);
      });
      
      var msg = format('bottom 3: %s', tmp.join(' | '));
      
      debug(msg);
      
      this.bot.notice(channel, msg);
    }
    
  }.bind(this), 'value DESC');
  
  return this;
};

/**
 * Expose `KarmaPlugin`.
 */

module.exports = KarmaPlugin;