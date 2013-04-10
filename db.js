var config = require('./config');
var pg     = require('pg');
var collections = module.exports.collections = {};

var query = module.exports.query = function (query, args, callback) {
	pg.connect(config.pg.dsn, function (err, client) {
		if (err) {
			return callback(err);
		}
		client.query(query, args, callback);
	});
};

module.exports.connect = function (callback) {
  query('SELECT * FROM _collections', function (err, results) {
    if (err) return callback(err);
    results.rows.forEach(function (row) {
      collections[row.name] = JSON.parse(row.data);
    });
    callback(null, collections);
  });
};
