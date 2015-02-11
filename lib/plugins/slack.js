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
var debug = require('debug')('nullstar:plugin:slack');
var Slack = require('slack-client');
/**
 * Creates an instance of a `SlackPlugin`.
 *
 * @constructor
 * @this {SlackPlugin}
 * @param {Bot} bot
 * @api public
 */

function SlackPlugin(bot) {
  Plugin.call(this, bot);

  if (!this.get('slack enabled')) {
    debug('skipping slack setup');
    return;
  }

  this.slack = new Slack(this.get('slack token'), true, true);
  this.slack.on('open', function() {
    var channels = [];
    var groups = [];
    var unreads = this.slack.getUnreadCount();
    var key;

    for (key in this.slack.channels) {
      if (this.slack.channels[key].is_member) {
        channels.push('#' + this.slack.channels[key].name);
      }
    }

    for (key in this.slack.groups) {
      if (this.slack.groups[key].is_open && !this.slack.groups[key].is_archived) {
        groups.push(this.slack.groups[key].name);
      }
    }

    debug('Welcome to Slack. You are @%s of %s', this.slack.self.name, this.slack.team.name);
    if (channels.length) debug('You are in: %s', channels.join(', '));
    if (groups.length) debug('As well as: %s', groups.join(', '));
    debug('You have %s unread ' + (unreads === 1 ? 'message' : 'messages'), unreads);
  }.bind(this));

  this.slack.on('message', function(message) {
    var type = message.type;
    var channel = this.slack.getChannelGroupOrDMByID(message.channel);
    var user = this.slack.getUserByID(message.user);
    var text = message.text;

    //console.log('Received: %s %s @%s %s "%s"', type, (channel.is_channel ? '#' : '') + channel.name, user.name, time, text);

    if (type === 'message' && (typeof channel === 'object' && channel.is_channel) && typeof user === 'object') {
      this.bot.handle(user.name, '#' + channel.name, text);
    }
  }.bind(this));

  this.slack.on('error', function(error) {
    debug('Error: %s', error);
  }.bind(this));

  this.slack.login();
}

/**
 * Inherit from `Plugin`.
 */

inherits(SlackPlugin, Plugin);

/**
 * The plugin name.
 */

SlackPlugin.prototype.name = 'Slack Plugin';

/**
 * The plugin version.
 */

SlackPlugin.prototype.version = '0.1';

/**
 * Expose `SlackPlugin`.
 */

module.exports = SlackPlugin;