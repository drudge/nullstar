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
var request = require('request');
var parser = require('xml2js').parseString;
var debug = require('debug')('nullstar:plugin:weather');

/**
 * Creates an instance of a `WeatherPlugin`.
 *
 * @constructor
 * @this {WeatherPlugin}
 * @param {Bot} bot
 * @api public
 */

function WeatherPlugin(bot) {
  Plugin.call(this, bot);
}

/**
 * Inherit from `Plugin`.
 */

inherits(WeatherPlugin, Plugin);

/**
 * The plugin name.
 */

WeatherPlugin.prototype.name = 'Weather Plugin';

/**
 * The plugin version.
 */

WeatherPlugin.prototype.version = '1.0';

/**
 * Post current bot uptime.
 *
 * @param {String} nick
 * @param {String} chan
 * @return {WeatherPlugin} this
 * @api private
 */

WeatherPlugin.prototype.$weather = function(nick, chan, location) {
  var onRequest = function(err, res, xml) {
    if (err) {
      console.error(err.stack);
      this.bot.notice(chan, format('Error looking up weather for `%s`', location));
      return;
    }
    
    parseString(xml, function(err, json) {
      if (err) {
        console.error(err.stack);
        return;
      }
      
      json = (json || {}).current_observation || {};
        
      if (typeof json.weather == 'object') {
        this.bot.notice(chan, 'Please input a proper location or zip code (US or Canada). ' +
                              'Note: Just entering a country as a location will not work.');
        return;
      }

      var out = format('Weather for %s · %s · Humidity: %s · %s · Wind: %s at %s mph', 
        json.display_location.full, 
        format('%s°F (%s°C)', json.temp_f, json.temp_c), 
        json.relative_humidity, 
        json.weather,
        json.wind_dir,
        json.wind_mph
      );
      
      debug('out %s', out);
      this.bot.notice(chan, out);
    }.bind(this));
  }.bind(this);

  request.get({
    uri: 'http://api.wunderground.com/auto/wui/geo/WXCurrentObXML/index.xml',
    qs: {
      query: location
    }
  }, onRequest);
  
  return this;
};

/**
 * Expose `WeatherPlugin`.
 */

module.exports = WeatherPlugin;