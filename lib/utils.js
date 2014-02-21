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
