/*!
 * Nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * Copyright (c) 2012 Joffrey Fuhrer <f.joffrey@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var debug = require('debug')('nullstar:storage');
var sqlite3 = require('sqlite3').verbose();
var utils = require('./utils');

/**
 * Creates an instance of an `Storage` database.
 *
 * @constructor
 * @this {Storage}
 * @param {String} file
 * @api public
 */

function Storage(file) {
  this.db = new sqlite3.Database(file);
}

/**
 * Create a collection with given `name` and `fields`.
 *
 * Field are defined as an object of objects. Eeach field object can contain:
 *    `type` {Mixed} storage type
 *    `default` {Mixed} Optional. The default value
 *    `primary` {Boolean} Optional. true if field primary key
 *    `unique` {Boolean} Optional. true if field values are unique
 *    `notnull` {Boolean} Optional. true if field can not contain null values
 *    `autoincrement` {Boolean} Optional. true if field autoincrements
 *    `ref` {Mixed} Optional. field references
 *
 * @param {String} name
 * @param {Object} fields
 * @param {Function} cb
 * @api public
 */

Storage.prototype.createCollection = function(name, fields, cb) {
  var query = 'CREATE TABLE IF NOT EXISTS ' + name + ' (';
  var first = true;
  
  for (var key in fields) {
    var field = fields[key];
    var deflt = field['default'];
    var ref = field.ref;
    var columnDec = (first ? (first = false, '') : ',') + key +
      (field.type ? ' ' + field.type : '') +
      (field.primary ? ' PRIMARY KEY' : '') +
      (field.autoincrement ? ' AUTOINCREMENT' : '') +
      (field.unique ? ' UNIQUE' : '') +
      (field.notnull ? ' NOT NULL' : '') +
      (deflt ? (' DEFAULT ' + deflt) : '') +
      (ref ? (' REFERENCES ' + ref) : '');
    query += columnDec;
  }
  
  query += ');';
  
  this.db.run(query, cb);
};

/**
 * Add an object into a collection.
 *
 * @param {String} collection
 * @param {Object} obj
 * @param {Function} cb
 * @api public
 *
 * Example:
 *
 * ```
 * insert('users', { username : 'foo', password : 'bar' }, function(err) { });
 * ```
 */

Storage.prototype.put = function(collection, obj, cb) {
  var dissected = utils.dissect(obj);
  var query = 'INSERT INTO ' + collection + ' (' + dissected.columns.join(',') + ')' +
    ' VALUES ' + dissected.valuesPlaceholder + ';';
  
  debug(query, '\n', dissected.values);
  
  this.db.run(query, dissected.values, cb);
};

/**
 * Add an array of objects into a collection.
 *
 * @param {String} collection
 * @param {Array} objs
 * @param {Function} cb
 * @api public
 *
 * Example:
 *
 * ```
 * insert('users', { username : 'foo', password : 'bar' }, function(err) { });
 * ```
 */

Storage.prototype.putAll = function(collection, objs, cb) {
  var fields = Object.keys(objs[0]);
  var firstRow = '';
  
  fields.forEach(function(column) {
    firstRow += (firstRow ? ', ?' : '?') + ' AS ' + column;
  });
  
  var values = objs.reduce(function(prev, item) {
    for (var i = 0, l = fields.length; i < l; i++) {
      prev.push(item[fields[i]] !== undefined ? item[fields[i]] : null);
    }
    return prev;
  }, []);
  
  var query = 'INSERT INTO ' + collection + ' (' + fields.join(',') + ') SELECT ' + firstRow +
    utils.repeat(' UNION SELECT ' + utils.repeat('?', ',', fields.length), '', objs.length - 1) + ';';
  
  debug(query, '\n', values);
  
  this.db.run(query, values, cb);
};

/**
 * Update objects collection `values` in object which match a given `filter`.
 *
 * @param {String} collection
 * @param {String|Object} filter
 * @param {Array} values
 * @param {Object} obj
 * @param {Function} cb
 * @api public
 *
 * Example:
 *
 * ```
 * update('users', 'username=?', ['foo'], { username : 'bar' }, function(err) {});
 * ```
 */

Storage.prototype.update = function(collection, filter, values, obj, cb) {
  var dissected = utils.dissect(obj);
  var query = 'UPDATE ' + collection + ' SET ';
  
  for (var i = 0, l = dissected.columns.length; i < l; i++) {
    query += dissected.columns[i] + '=?' + (i < l - 1 ? ',' : '');
  }
  
  query += ' WHERE ' + filter + ';';
  
  debug(query);
  
  this.db.run(query, dissected.values.concat(values), cb);
};

/**
 * Delete objects collection `values` from object which match a given `filter`.
 *
 * @param {String} collection
 * @param {String|Object} filter
 * @param {Array} values
 * @param {Function} cb
 * @api public
 *
 * Example:
 *
 * ```
 * remove('users', 'email IS NULL', null, function(err) {});
 * ```
 */

Storage.prototype.remove = function(collection, filter, values, cb) {
  var query = 'DELETE FROM ' + collection + ' WHERE ' + filter + ';';
  
  debug(query);
  
  this.db.run(query, values || [], cb);
};

/**
 * Fetches objects collection `values` from object which match a given `filter`.
 *
 * @param {String} collection
 * @param {Object{ relationships
 * @param {Array|String} fields
 * @param {String|Object} filter
 * @param {Array} values
 * @param {Function} cb
 * @param {Mixed} order
 * @param {Mixed} limit
 * @param {Mixed} distinct
 * @api public
 *
 * Example:
 *
 * ```
 * fetch('torrents', { 'users' : 'users.id=torrents.user_id' }, null,
 *   'torrents.user_id=?', [1], function(err, rows) { ... });
 * ```
 */

Storage.prototype.fetch = function(collection, relationships, fields, filter, values, cb, order, limit, distinct) {
  var query = 'SELECT ' + (distinct ? 'DISTINCT ' : '') +
    (fields ? utils.cols(fields) : '*') + ' FROM ' + collection;
    
  if (relationships) {
    for (var field in relationships) {
      query += ', ' + field + ' ON ' + relationships[field];
    }
  }
  
  query += ' WHERE ' + filter + (order ? ' ORDER BY ' + order : '') +
      (limit ? ' LIMIT ' + limit : '') + ';';
      
  debug(query, '\n', values);
  
  this.db.all(query, values || [], cb);
};

/**
 * Fetches a single object from a collection that matches a provided `filter`.
 *
 * @param {String} collection
 * @param {Object{ relationships
 * @param {Array|String} fields
 * @param {String|Object} filter
 * @param {Array} values
 * @param {Function} cb
 * @param {Mixed} order
 * @param {Mixed} limit
 * @param {Mixed} distinct
 * @api public
 *
 * Example:
 *
 * ```
 * fetchOne('users', null, { 'users.username': 'name' }, 'name=?', ['bar'],
 *   function(err, row) { });
 * ```
 */

Storage.prototype.fetchOne = function(collection, relationships, fields, filter, values, cb) {
  var query = 'SELECT ' + (fields ? utils.cols(fields) : '*') + ' FROM ' + collection;
  
  if (relationships) {
    for (var field in relationships) {
      query += ', ' + field + ' ON ' + relationships[field];
    }
  }
  
  query += ' WHERE ' + filter + ';';
  
  debug(query, '\n', values);
  
  this.db.get(query, values || [], cb);
};

/**
 * Fetches a single object from a collection with a given `id`.
 *
 * @param {String} collection
 * @param {Mixed} id
 * @param {Function} cb
 * @api public
 *
 * Example:
 *
 * ```
 * find('users', 1, function(err, user) { });
 * ```
 */

Storage.prototype.find = function(collection, id, cb) {
  this.fetchOne(collection, null, null, 'id=?', [id], cb);
};

/**
 * Fetches all objects from a collection.
 *
 * @param {String} collection
 * @param {Function} cb
 * @api public
 *
 * Example:
 *
 * ```
 * list('users', function(err, users) { });
 * ```
 */

Storage.prototype.all = function(collection, cb) {
  this.fetch(collection, null, null, '1', [], cb);
};

/**
 * Update object in collection with given id.
 *
 * @param {String} collection
 * @param {Mixed} id - optional
 * @param {Object} obj
 * @param {Function} cb
 * @api public
 *
 * Examples:
 *
 * ```
 * updateById('users', 1, { username : 'foo' }, function(err) {});
 *
 * updateById('users', { id : 1, username : 'foo' }, function(err) {});
 * ```
 */

Storage.prototype.updateById = function(collection, id, obj, cb) {
  if (arguments.length == 3) {
    cb = obj;
    obj = id;
    id = obj.id;
  }
  this.update(collection, 'id=?', [id], obj, cb);
};

/**
 * Remove an object in collection with given `id`.
 *
 * @param {String} collection
 * @param {Mixed} id
 * @param {Object} obj
 * @param {Function} cb
 * @api public
 *
 * Examples:
 *
 * ```
 * removeById('users', 1, function(err) {});
 * ```
 */

Storage.prototype.removeById = function(collection, id, cb) {
  this.remove(collection, 'id=?', [id], cb);
};

/**
 * Puts the execution mode of the storage into serialized.
 *
 * This means that at most one statement object can execute a query at a time.
 * Other statements wait in a queue until the previous statements executed.
 *
 * @param {Function} cb
 * @api public
 */

Storage.prototype.serialize = function(cb) {
  this.db.serialize(cb);
};

/**
 * Puts the execution mode into parallelized.
 *
 * This means that queries scheduled will be run in parallel.
 *
 * If a callback is provided, it will be called immediately. All database queries
 * scheduled in that callback will run parallelized. After the function returns,
 * the database is set back to its original mode again.
 *
 * Calling `Storage#parallelize()` with in nested functions is safe.
 *
 * @param {Function} cb
 * @api public
 */

Storage.prototype.parallelize = function(cb) {
  this.db.parallelize(cb);
};


/**
 * Close any open collections.
 *
 * @param {Function} cb
 * @api public
 */

Storage.prototype.close = function(cb) {
  this.db.close(cb);
};

/**
 * Expose `Storage`.
 */

module.exports = Storage;