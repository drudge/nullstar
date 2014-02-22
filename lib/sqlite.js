/*!
 * Nullstar
 * Copyright(c) 2014 Nicholas Penree <nick@penree.com>
 * Copyright (c) 2012 Joffrey Fuhrer <f.joffrey@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var debug = require('debug')('nullstar:sqlite');
var sqlite = require('sqlite3').verbose();
var utils = require('./utils');

/**
 * Creates an instance of an `SQLite` database.
 *
 * @constructor
 * @this {SQLite}
 * @param {String} file
 * @api public
 */

function SQLite(file) {
  this.db = new sqlite.Database(file);
}

/**
 * Create a table with given `name` and `columns`.
 *
 * @param {String} name
 * @param {Object} columns
 * @param {Function} cb
 * @api public
 */

SQLite.prototype.createTable = function(name, columns, cb) {
  var query = 'CREATE TABLE IF NOT EXISTS ' + name + ' (';
  var first = true;
  
  for (var key in columns) {
    var deflt = columns[key]['default'];
    var ref = columns[key].ref;
    var columnDec = (first ? (first = false, '') : ',') + key +
      (columns[key].type ? ' ' + columns[key].type : '') +
      (columns[key].primary ? ' PRIMARY KEY' : '') +
      (columns[key].autoincrement ? ' AUTOINCREMENT' : '') +
      (columns[key].unique ? ' UNIQUE' : '') +
      (columns[key].notnull ? ' NOT NULL' : '') +
      (deflt ? (' DEFAULT ' + deflt) : '') +
      (ref ? (' REFERENCES ' + ref) : '');
    query += columnDec;
  }
  
  query += ');';
  
  this.db.run(query, cb);
};

/**
 * Insert `obj` into `table`.
 *
 * @param {String} table
 * @param {Object} obj
 * @param {Function} cb
 * @api public
 *
 * Example:
 *    insert('users', { username : 'foo', password : 'bar' }, function(err) { });
 */

SQLite.prototype.insert = function(table, obj, cb) {
  var dissected = utils.dissect(obj);
  var query = 'INSERT INTO ' + table + ' (' + dissected.columns.join(',') + ')' +
    ' VALUES ' + dissected.valuesPlaceholder + ';';
  
  debug(query, '\n', dissected.values);
  
  this.db.run(query, dissected.values, cb);
};

/**
 * Insert `objs` into `table`.
 *
 * @param {String} table
 * @param {Array} objs
 * @param {Function} cb
 * @api public
 *
 * Example:
 *    insert('users', { username : 'foo', password : 'bar' }, function(err) { });
 */

SQLite.prototype.insertAll = function(table, objs, cb) {
  var columns = Object.keys(objs[0]);
  var firstRow = '';
  
  columns.forEach(function(column) {
    firstRow += (firstRow ? ', ?' : '?') + ' AS ' + column;
  });
  
  var values = objs.reduce(function(prev, item) {
    for (var i = 0, l = columns.length; i < l; i++) {
      prev.push(item[columns[i]] !== undefined ? item[columns[i]] : null);
    }
    return prev;
  }, []);
  
  var query = 'INSERT INTO ' + table + ' (' + columns.join(',') + ') SELECT ' + firstRow +
    utils.repeat(' UNION SELECT ' + utils.repeat('?', ',', columns.length), '', objs.length - 1) + ';';
  
  debug(query, '\n', values);
  
  this.db.run(query, values, cb);
};

/**
 * update('users', 'username=?', ['foo'], { username : 'bar' }, function(err) {});
 */
SQLite.prototype.update = function(table, whereClause, whereValues, obj, cb) {
  var dissected = utils.dissect(obj);
  var query = 'UPDATE ' + table + ' SET ';
  
  for (var i = 0, l = dissected.columns.length; i < l; i++) {
    query += dissected.columns[i] + '=?' + (i < l - 1 ? ',' : '');
  }
  
  query += ' WHERE ' + whereClause + ';';
  
  debug(query);
  
  this.db.run(query, dissected.values.concat(whereValues), cb);
};
/**
 * remove('users', 'email IS NULL', null, function(err) {});
 */
SQLite.prototype.remove = function(table, whereClause, whereValues, cb) {
  var query = 'DELETE FROM ' + table + ' WHERE ' + whereClause + ';';
  
  debug(query);
  
  this.db.run(query, whereValues || [], cb);
};

/**
 * select('Torrents', { 'users' : 'users.id=Torrents.UserId' }, null,
 *   'Torrents.UserId=?', [1], function(err, rows) { ... });
 */
SQLite.prototype.select = function(table, joins, columns, whereClause, whereValues, cb, order, limit, distinct) {
  var query = 'SELECT ' + (distinct ? 'DISTINCT ' : '') +
    (columns ? utils.cols(columns) : '*') + ' FROM ' + table;
    
  if (joins) {
    for (var tbl in joins) {
      query += ', ' + tbl + ' ON ' + joins[tbl];
    }
  }
  
  query += ' WHERE ' + whereClause + (order ? ' ORDER BY ' + order : '') +
      (limit ? ' LIMIT ' + limit : '') + ';';
      
  debug(query, '\n', whereValues);
  
  this.db.all(query, whereValues || [], cb);
};

/**
 * selectOne('users', null, { 'users.username': 'name' }, 'name=?', ['bar'],
 *   function(err, row) { });
 */
SQLite.prototype.selectOne = function(table, joins, columns, whereClause, whereValues, cb) {
  var query = 'SELECT ' + (columns ? utils.cols(columns) : '*') + ' FROM ' + table;
  
  if (joins) {
    for (var tbl in joins) {
      query += ', ' + tbl + ' ON ' + joins[tbl];
    }
  }
  
  query += ' WHERE ' + whereClause + ';';
  
  debug(query, '\n', whereValues);
  
  this.db.get(query, whereValues || [], cb);
};

// Shortcut methods for common tasks, using those above.

/**
 * find('users', 1, function(err, user) { });
 */
SQLite.prototype.find = function(table, id, cb) {
  this.selectOne(table, null, null, 'id=?', [id], cb);
};

/**
 * list('users', function(err, users) { });
 */
SQLite.prototype.list = function(table, cb) {
  this.select(table, null, null, '1', [], cb);
};

/**
 * Two ways of using this one:
 * updateById('users', 1, { username : 'foo' }, function(err) {});
 * updateById('users', { id : 1, username : 'foo' }, function(err) {});
 */
SQLite.prototype.updateById = function(table, id, obj, cb) {
  if (arguments.length == 3) {
    cb = obj;
    obj = id;
    id = obj.id;
  }
  this.update(table, 'id=?', [id], obj, cb);
};

/**
 * removeById('users', 1, function(err) {});
 */
SQLite.prototype.removeById = function(table, id, cb) {
  this.remove(table, 'id=?', [id], cb);
};

// Just a proxy to the underlying sqlite3 functions.

SQLite.prototype.serialize = function(cb) {
  this.db.serialize(cb);
};

SQLite.prototype.parallelize = function(cb) {
  this.db.parallelize(cb);
};

SQLite.prototype.close = function(cb) {
  this.db.close(cb);
};

/**
 * Expose `SQLite`.
 */

module.exports = SQLite;