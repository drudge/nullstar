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

exports.dissect = function(obj) {
  var res = {
    columns : [],
    values : [],
    valuesPlaceholder : '('
  };
  var first = true;
  
  for (var i in obj) {
    res.columns.push(i);
    res.values.push(obj[i]);
    res.valuesPlaceholder += (first ? (first = false, '?') : ',?');
  }
  res.valuesPlaceholder += ')';
  
  return res;
};

exports.cols = function(columns) {
  if (Array.isArray(columns)) {
    return columns.join(',');
  }

  var res = '';
  var first = true;
  
  for (var col in columns) {
    res += (first ? (first = false, '') : ',') + col +
      (columns[col] ? ' AS ' + columns[col] : '');
  }
  return res;
};

exports.repeat = function(seq, sep, n) {
  if (n == 0) {
    return '';
  }

  var res = '';
  
  while (n > 1) {
    if (n % 2 == 1) {
      res += sep + seq;
      n--;
    }
    seq += sep + seq;
    n /= 2;
  }
  
  return seq + res;
};