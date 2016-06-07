/*!
 * Nullstar
 * Copyright(c) 2015 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

var inherits = require('util').inherits;
var Transport = require('../transport');
var debug = require('debug')('nullstar:transports:slack');
var once = require('once');
var RtmClient = require('@slack/client').RtmClient;

/**
 * Creates an instance of a `SlackTransport`.
 *
 * @constructor
 * @this {SlackTransport}
 * @param {Bot} bot
 * @api public
 */

function SlackTransport(bot) {
  Transport.call(this, bot);
  this.connection = new RtmClient(this.get('slack token'), {
    logLevel: 'info',
    autoReconnect: true
  });
}

/**
 * Inherit from `Transport`.
 */

inherits(SlackTransport, Transport);

/**
 * The SlackTransport name.
 */

SlackTransport.prototype.name = 'Slack Transport';

/**
 * The SlackTransport version.
 */

SlackTransport.prototype.version = '0.1';

/**
 * The SlackTransport identifier.
 */

SlackTransport.prototype.id = 'slack';

/**
 * Connect to the IRC network and authenticate with NickServ if needed.
 *
 * @param {Function} fn
 * @return {Bot} this
 * @api public
 */

SlackTransport.prototype.connect = function(fn) {
  var slack = this.connection;
  var done = once(fn);


  slack.on('open', function() {
    var channels = [];
    var groups = [];

    // Get the user's name
    var user = slack.dataStore.getUserById(slack.activeUserId);

    // Get the team's name
    var team = slack.dataStore.getTeamById(slack.activeTeamId);

    debug('Welcome to Slack. You are @%s of %s', user.name, team.name);
    if (channels.length) debug('You are in: %s', channels.join(', '));
    if (groups.length) debug('As well as: %s', groups.join(', '));
    //debug('You have %s unread ' + (unreads === 1 ? 'message' : 'messages'), unreads);
    done();
  }.bind(this));

  slack.on('message', function(message) {
    var type = message.type;
    var channel = slack.dataStore.getChannelGroupOrDMById(message.channel);
    var user = slack.dataStore.getUserById(message.user);
    var text = message.text;

    //console.log('Received: %s %s @%s %s "%s"', type, (channel.is_channel ? '#' : '') + channel.name, user.name, time, text);

    if (type === 'message' && (typeof channel === 'object' && channel.is_channel) && typeof user === 'object') {
      var ids = text.match(/@(\w+)/);
      if (ids && ids.length > 1) {
        ids.forEach(function(id) {
          var referencedUser = slack.dataStore.getUserById(id);
          if (referencedUser && referencedUser.name) {
            text = text.replace('<@' + id + '>', '@' + referencedUser.name);
          }
        }, this);
      }
      this.bot.handle(this.id, user.name, '#' + channel.name, text);
    }

  }.bind(this));
  slack.on('error', done);
  slack.start();

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

SlackTransport.prototype.disconnect = function(message, fn) {
  this.connection.disconnect(message);
  fn();
  return this;
};

SlackTransport.prototype.notice = function(channel, msg) {
  this.say(channel, msg);
};

SlackTransport.prototype.say = function(channel, msg) {
  var chan = this._getChannel(channel);
  if (chan) this.connection.sendMessage(msg, chan.id);
};

SlackTransport.prototype._getChannel = function(channel) {
  return this.connection.dataStore.getChannelByName(channel);
}

SlackTransport.prototype.users = function(channel) {
  var users = [];
  var chan = this._getChannel(channel);

  if (chan) {
    var userList = chan.members || [];
    userList.forEach(function(id) {
      var user = this.connection.dataStore.getUserById(id);
      if (user && user.name) users.push(user.name);
    }, this);
  }

  return users;
};

/**
 * Expose `SlackTransport`.
 */

module.exports = SlackTransport;