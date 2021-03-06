/*!
* Nullstar
* Copyright(c) 2014 Nicholas Penree <nick@penree.com>
* MIT Licensed
*/

/**
 * Module dependencies.
 */

var Twitter = require('twitter');
var Plugin = require('../plugin');
var inherits = require('util').inherits;
var format = require('util').format;
var debug = require('debug')('nullstar:plugin:tweet');
var timeago = require('timeago');
var ent = require('ent');

/**
 * Creates an instance of a `TweetPlugin`.
 *
 * @constructor
 * @this {TweetPlugin}
 * @param {Bot} bot
 * @api public
 */

function TweetPlugin(bot) {
  Plugin.call(this, bot);
  this.twitter = new Twitter({
    consumer_key: this.get('twitter consumer key'),
    consumer_secret: this.get('twitter consumer secret'),
    access_token_key: this.get('twitter access token'),
    access_token_secret: this.get('twitter access token secret')
  });
}

/**
 * Inherit from `Plugin`.
 */

inherits(TweetPlugin, Plugin);

/**
 * The plugin name.
 */

TweetPlugin.prototype.name = 'Tweet Plugin';

/**
 * The plugin version.
 */

TweetPlugin.prototype.version = '0.9';

/**
 * Handle an incoming message, and notice tweet content in channel if wanted.
 *
 * @param {String} id
 * @param {String} from
 * @param {String} channel
 * @param {String} message
 * @return {Boolean}
 * @api public
 */

TweetPlugin.prototype.handle = function(id, from, channel, message) {
  // only perform tweet actions on allowed channels
  if (this.get('twitter allowed channels', []).indexOf(channel) === -1) return false;

  // handle plugin commands
  var handled = TweetPlugin.super_.prototype.handle.call(this, from, channel, message);
  var matches = message.match(/https?:\/\/twitter\.com\/.*\/status\/([0-9]+)/);

  if (!handled && this.get('twitter notice tweets', true) && matches && matches.length >= 2) {
    var id = matches[1];

    this.twitter.get('/statuses/show/' + id + '.json', {include_entities:true}, function(data) {
      if (!data) return;
      data.user = data.user || {};
      var msg = format('\00310,01\002Twitter\017 | %s (@%s) %s: %s',
          ent.decode(data.user.name),  ent.decode(data.user.screen_name), timeago(data.created_at), ent.decode(data.text));

      debug(msg);

      msg.split('\n').forEach(function(line) {
        if (line) this.bot.notice(id, channel, line);
      }.bind(this));
    }.bind(this));

    handled = true;
  }


  return handled;
};

/**
 * Post `status` as a tweet.
 *
 * @param {String} id
 * @param {String} nick
 * @param {String} chan
 * @param {String} status
 * @return {TweetPlugin} this
 * @api private
 */

TweetPlugin.prototype.$tweet = function(id, nick, chan, status) {
  status = (status || '').trim();

  if (status.length) {
    debug('tweeting \'%s\'', status);
    this.twitter.updateStatus(status, function(data) {
      this.emit('tweet', data);
      if (data.id_str) {
        if (this.bot) this.bot.notice(id, chan, format('https://twitter.com/%s/status/%s', data.user.screen_name, data.id_str));
      } else {
        this.error(id, chan, data);
      }
    }.bind(this));
  }

  return this;
};

/**
 * Alias `tweet` to `twat`.
 */

TweetPlugin.prototype.$twat = TweetPlugin.prototype.$tweet;

/**
 * Remove a tweet using the `id` or url.
 *
 * @param {String} id
 * @param {String} nick
 * @param {String} chan
 * @param {String} id/url
 * @return {TweetPlugin} this
 * @api private
 */

TweetPlugin.prototype.$rmtweet = function(id, nick, chan, id) {
  if (id.length) {
    var matches = id.match(/https?:\/\/twitter\.com\/.*\/status\/([0-9]+)/);

    if (matches && matches.length >= 2) {
      id = matches[1];
    }

    debug('deleting tweet id \'%s\'', id);

    this.twitter.destroyStatus(id, function(data) {
      this.emit('destroy', data);
      if (data.id_str) {
        if (this.bot) this.bot.notice(id, chan, format('Tweet deleted (%s)', id));
      } else {
        this.error(id, chan, data);
      }
    }.bind(this));
  }

  return this;
};

/**
 * Alias `rmtweet` to `rmtwat`.
 */

TweetPlugin.prototype.$rmtwat = TweetPlugin.prototype.$rmtweet;

/**
 * Retweet a tweet using the `id` or url.
 *
 * @param {String} id
 * @param {String} nick
 * @param {String} chan
 * @param {String} twid/url
 * @return {TweetPlugin} this
 * @api private
 */

TweetPlugin.prototype.$retweet = function(id, nick, chan, twid) {
  if (id.length) {
    var matches = twid.match(/https?:\/\/twitter\.com\/.*\/status\/([0-9]+)/);

    if (matches && matches.length >= 2) {
      twid = matches[1];
    }

    debug('retweet id \'%s\'', twid);

    this.twitter.retweetStatus(twid, function(data) {
      if (!data) return;
      this.emit('retweet', data);
      if (data.id_str) {
        if (this.bot) this.bot.say(id, chan, format('Retweet: https://twitter.com/%s/status/%s', data.user.screen_name, data.id_str));
      } else {
        this.error(id, chan, data);
      }
    }.bind(this));
  }

  return this;
};

/**
 * Aliases for `retweet`.
 */

TweetPlugin.prototype.$retwat = TweetPlugin.prototype.$retweet;
TweetPlugin.prototype.$rt = TweetPlugin.prototype.$retweet;
TweetPlugin.prototype.$RT = TweetPlugin.prototype.$retweet;

TweetPlugin.prototype.$twreply = function(id, nick, chan, args) {
  args = (args || '').trim().split(' ');

  if (!args.length || args.length < 2) return this;

  var id = args.shift();
  var matches = id.match(/https?:\/\/twitter\.com\/.*\/status\/([0-9]+)/);
  var status = args.join(' ') || '';

  if (matches && matches.length >= 2) {
    id = matches[1];
  }

  if (!status.length) return;

  this.twitter.get(format('/statuses/show/%s.json', id), {
    include_entities: true
  }, function(tweet) {
    if (!tweet) return;

    var user = (tweet.user || {}).screen_name;
    var isSomeoneElse = ((user && user != this.get('twitter username')));
    var notAlreadyAddressed = (status.charAt(0) != '@');

    if (isSomeoneElse && notAlreadyAddressed) {
      status = format('@%s %s', user, status);
    }

    debug('replying \'%s\' to %s (%s)', status, id, user);
    this.twitter.updateStatus(status, { in_reply_to_status_id: id }, function(data) {
      if (!data) return;
      this.emit('tweet', data);
      if (data.id_str.length) {
        if (this.bot) this.bot.notice(id, chan, format('Reply URL: https://twitter.com/%s/status/%s', data.user.screen_name, data.id_str));
      } else {
        this.error(id, chan, data);
      }
    }.bind(this));
  }.bind(this));
  return this;
};

TweetPlugin.prototype.$tweply = TweetPlugin.prototype.$twreply;

/**
 * Send Twitter webservice error to `channel` as a notice.
 *
 * @param {String} id
 * @param {String} channel
 * @param {Object} data
 * @return {TweetPlugin} this
 * @api private
 */

TweetPlugin.prototype.error = function(id, channel, data) {
  var errors;
  data = data || {};

  try {
    var tmp = JSON.parse(data.data);
    errors = tmp.errors;
  } catch (e) {}

  if (errors && errors.length) {
    if (errors.length >= 1) {
      if (this.bot) this.bot.error(id, channel, errors[0]);
    }
  }

  return this;
};

/**
 * Expose `TweetPlugin`.
 */

module.exports = TweetPlugin;
