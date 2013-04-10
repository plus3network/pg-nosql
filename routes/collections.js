var db      = require('../db');
var util    = require('util');
var async   = require('async');
var restify = require('restify');
var _       = require('underscore');

/**
 * List the collections in the system
 *
 * @param req The request object
 * @param res The response object
 * @param next The next response handler
 * @return void
 */
var list = module.exports.list = function (req, res, next) {
  db.query('SELECT name FROM _collections', function (err, results) {
    if(err) {
      return next(err);
    }

    var collections = _.map(results.rows, function (row) {
      return row.name;
    });
    res.send(collections);
  });
};


/**
 * Create a new collection in the system
 *
 * @param req The request object
 * @param res The response object
 * @param next The next response handler
 * @return void
 */
var create = module.exports.create = function (req, res, next) {

  var name  = req.params[0];
  var data  = JSON.parse(req.body);
  var tasks = [];
  
  // Check to see if the collection exists
  tasks.push(function (callback) {
    var query = "SELECT name FROM _collections WHERE name = $1";
    db.query(query, [name], function (err, info) {
      if(info.rowCount !== 0) {
        return callback(new Error(util.format('"%s" collection already exists.', name)));
      }

      callback(err, info);
    });
  });
 
  // Create the collection
  tasks.push(function (callback) {
    var query = 
      'CREATE TABLE IF NOT EXISTS %s ( '+
      '  id uuid, '+
      '  data json, '+
      '  CONSTRAINT %s_pkey PRIMARY KEY (id)'+
      ');';
    query = util.format(query, name, name);
    db.query(query, function (err, info) {
      callback(err, info); 
    });
  });

  // Store the collection name in the collections table with metadata
  tasks.push(function (callback) {
    var query = "INSERT INTO _collections (name, data) VALUES ($1, $2)";
    db.query(query, [name, JSON.stringify(data)], function (err, info) {
      callback(err, info);
    });
  });

  async.series(tasks, function (err, results) {
    if (err) {
      return next(err);
    }
    db.collections[name] = data;
    res.send(201, { collection: name, status: 'created'});
  });
  
};
