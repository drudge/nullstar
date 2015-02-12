/**
 * Forward `functions` from `from` to `to`.
 *
 * The `this` context of forwarded functions remains bound to the `to` object,
 * ensuring that property polution does not occur.
 *
 * @param {Object} from
 * @param {Object} to
 * @param {Array} functions
 * @api private
 */

 exports.forward = function(from, to, functions) {
  for (var i = 0, len = functions.length; i < len; i++) {
    var method = functions[i];
    from[method] = to[method].bind(to);
  }
};

/**
 * Sanitize a string by removing `../`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

exports.sanitize = function(str) {
	return str.replace(/\.\.\//g, '');
}

/**
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

exports.dissect = function(obj) {
  var res = {
    columns : [],
    values : [],
    valuesPlaceholder : '('
  };
  var first = true;

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      res.columns.push(i);
      res.values.push(obj[i]);
      res.valuesPlaceholder += (first ? (first = false, '?') : ',?');
    }
  }
  res.valuesPlaceholder += ')';

  return res;
};


/**
 * @param {Object} columns
 * @return {String}
 * @api private
 */

exports.cols = function(columns) {
  if (Array.isArray(columns)) {
    return columns.join(',');
  }

  var res = '';
  var first = true;

  for (var col in columns) {
    if (columns.hasOwnProperty(col)) {
      res += (first ? (first = false, '') : ',') + col +
        (columns[col] ? ' AS ' + columns[col] : '');
    }
  }
  return res;
};


/**
 * @param {String} str
 * @param {String} sep
 * @param {Number} n
 * @return {String}
 * @api private
 */

exports.repeat = function(str, sep, n) {
  if (n === 0) {
    return '';
  }

  var res = '';

  while (n > 1) {
    if (n % 2 == 1) {
      res += sep + str;
      n--;
    }
    str += sep + str;
    n /= 2;
  }

  return str + res;
};

/**
 * Async version of Array.forEach, with optional completion callback.
 *
 * Example:
 * ```
 * var fruits = ['apple', 'banana', 'kiwi'];
 * utils.forEach(fruits, function(fruit, next) {
 *   console.log(fruit);
 *   next();
 * }, function() {
 *   console.log('best fruits accounted for');
 * });
 * ```
 * @param {Array} arr array to iterate
 * @param {Function} iter iterator fn(item, next)
 * @param {Function} fn callback invoked on compltion
 * @api public
 */

exports.forEach = function forEach(arr, iter, fn) {
  var item = arr.shift();
  if (item) {
    iter(item, function() {
      forEach(arr, iter, fn);
    });
  } else if ('function' == typeof fn) {
    fn();
  }
};