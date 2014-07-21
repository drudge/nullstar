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
var weather = require('weatherapi');
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
  weather.config({
    api_key: bot.get('weather api key')
  });
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
  
  weather.forecast(location, {cc:'yes', includeLocation: 'yes'}, function(err, json) {
    if (err) console.log(err);
    
    json = (json || {}).data || {};
    
    if (!json.current_condition.length) {
      this.bot.notice(chan, 'Please input a proper location or zip code (US or Canada). ' +
                            'Note: Just entering a country as a location will not work.');
      return;
    }
    
    var cond = json.current_condition[0]; 
    var area = json.nearest_area;
    
    var place = (json.request || [ {query: location}])[0].query;
       
    try {
      place = area[0].areaName[0].value + ', ' + area[0].region[0].value;
    } catch (e) {
      place = (json.request || [ {query: location}])[0].query;
    }
 
    var out = format('Weather for %s · %s · Humidity: %s% · %s · Wind: %s at %s mph', 
      place, 
      format('%s°F (%s°C)', cond.temp_F, cond.temp_C), 
      cond.humidity, 
      cond.weatherDesc[0].value,
      cond.winddir16Point,
      cond.windspeedMiles
    );
    
    debug('out %s', out);
    this.bot.notice(chan, out);

  }.bind(this));

  return this;
};

/**
 * Expose `WeatherPlugin`.
 */

module.exports = WeatherPlugin;