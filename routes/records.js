var db = require('../db');
var util = require('util');
var restify = require('restify');
var _ = require('underscore');
var inflection = require('inflection');
var uuid = require('uuid-v4.js');

/**
 * Transforms a record for display
 * 
 * @param record The record to transform
 */
function transformRecord (record) {
  var rec = undefined;
  try {
    rec = JSON.parse(record.data);
  } catch (e) {
    return;
  }

  var joins = _.omit(record, 'id', 'data');
  _.keys(joins).forEach(function (key) {
    var data = undefined;
    var id = rec[key];
    try {
      rec[key] = JSON.parse(joins[key]);
      rec[key].id = id;
    } catch (e) { return; }
  });
	rec.id = record.id;
	return rec;
}

var selectQuery = function (collectionName) {
  var collection = db.collections[collectionName]; 
  var joinFields = collection.relationships.hasOne && _.keys(collection.relationships.hasOne) || [];
  var fields = [];
  var tables = [];
  fields.push(util.format('%s.id', collectionName));
  fields.push(util.format('%s.data as data', collectionName));
  tables.push(collectionName);
  joinFields.forEach(function (name) {
    var joinName = collection.relationships.hasOne[name];
    fields.push(util.format('%s.data as %s', joinName, inflection.singularize(name)));
    tables.push(util.format('JOIN %s ON (json_path_uuid(%s.data, \'$.%s\') = %s.id)', joinName, collectionName, name, joinName));
  });
	return util.format('SELECT %s FROM %s', fields.join(','), tables.join(' '));
};

/**
 * List the records from a collection
 *
 * @param req The request object
 * @param res The response object
 * @param next The next response handler
 * @return void
 */
var list = module.exports.list = function (req, res, next) {
	var start = parseInt(req.query.start) || 0;
	var rows = parseInt(req.query.rows) || 20;

  var collectionName = req.params[0];
  var query = selectQuery(collectionName);
  query += ' LIMIT $1 OFFSET $2';
	var values = [];

	values.push(rows);
	values.push(start);

  console.log(query, values);

	db.query(query, values, function (err, results) {
		if (err) {
			return next(err);
		}

		var records = _.map(results.rows, transformRecord);
		res.send(records);
	});
};

/**
 * This will get a record from a collection
 *
 * @param req The request object
 * @param res The response object
 * @param next The next response handler
 * @return void
 */
var get = module.exports.get = function (req, res, next) {
  var collectionName = req.params[0];
  var collection = db.collections[collectionName]; 
  var joinFields = collection.relationships.hasOne && _.keys(collection.relationships.hasOne) || [];
  var fields = [];
  var tables = [];
  fields.push(util.format('%s.id', collectionName));
  fields.push(util.format('%s.data as data', collectionName));
  tables.push(collectionName);
  joinFields.forEach(function (name) {
    var joinName = collection.relationships.hasOne[name];
    fields.push(util.format('%s.data as %s', joinName, inflection.singularize(name)));
    tables.push(util.format('JOIN %s ON (json_path_uuid(%s.data, \'$.%s\') = %s.id)', joinName, collectionName, name, joinName));
  });
	var query = util.format('SELECT %s FROM %s WHERE %s.id = $1', fields.join(','), tables.join(' '), collectionName);
  console.log(query);
	db.query(query, [req.params[1]], function (err, results) {
		if (err) {
			return next(err);
		}

		if (results.rowCount=== 0) {
			return next(new restify.ResourceNotFoundError('Resource Not Found'));
		}

		res.send(transformRecord(results.rows[0]));
	});
};

/**
 * This will create a record from a collection
 *
 * @param req The request object
 * @param res The response object
 * @param next The next response handler
 * @return void
 */
var create = module.exports.create = function (req, res, next) {
	var data = JSON.parse(req.body);
	var id = uuid();
  var collectionName = req.params[0];
  var collection = db.collections[collectionName]; 
  var fields = collection.relationships.hasOne && _.keys(collection.relationships.hasOne) || [];

  fields.forEach(function (field) {
    data[field] = data[field] && data[field].id;
  });
  
	// We need to remove the data.id if it exists
	delete data.id;

	var query = util.format('INSERT INTO %s (id, data) VALUES ($1, $2)', collectionName);
	var values = [id, JSON.stringify(data)];

	db.query(query, values, function (err, info) {
		if (err) {
			return next(err);
		}
		
		data.id = id;
		res.send(201, data);
	});
};

/**
 * This will update a record from a collection
 *
 * @param req The request object
 * @param res The response object
 * @param next The next response handler
 * @return void
 */
var update = module.exports.update = function (req, res, next) {
  var data = JSON.parse(req.body);
  var id = req.params[1];

  delete data.id;

  // TODO: Change this to an upsert.
  var query = util.format('UPDATE %s SET data = ? WHERE id = ?', req.params[0]);
  var values = [JSON.stringify(data), id];

  db.query(query, values, function (err, info) {
    if (err) {
      return next(err);
    }

    data.id = id;
    res.send(200, data);

  });

};

/**
 * This will delete a record from a collection
 *
 * @param req The request object
 * @param res The response object
 * @param next The next response handler
 * @return void
 */
var del = module.exports.del = function (req, res, next) {
 var id = req.param[1];
 var query = util.format("DELETE FROM %s WHERE id = ?", req.params[0]);

 db.query(query, values, function (err, info) {
  if (err) {
    return next(err);
  }

  res.send(204);
 });
};

var subresource = module.exports.subresource = function (req, res, next) {
  var collectionName = req.params[0];
  var collection = db.collections[collectionName]; 
  var id = req.params[1];
  var resource = req.params[2];
  var field = collection.relationships.hasMany && collection.relationships.hasMany[req.params[2]];

  var query = "SELECT * FROM %s WHERE json_path_uuid(%s.data, '$.%s') = $1";
  query = util.format(query, resource, resource, field);
  db.query(query, [id], function (err, results) {
    if (err) return next(err);
		var records = _.map(results.rows, transformRecord);
		res.send(records);
  });
};
