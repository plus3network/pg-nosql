var config = require('./config');
var pg     = require('pg');

module.exports.query = function (query, args, callback) {
	pg.connect(config.pg.dsn, function (err, client) {
		if (err) {
			return callback(err);
		}
		client.query(query, args, callback);
	});
};
