var restify = require('restify');
var connect = require('connect');

var server = restify.createServer({
  name: 'data-store'
});

// Plugins
server.use(function (req, res, next) {
  var logger = connect.logger('dev');
  req.originalUrl = req.url;
  logger(req, res, next);
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.bodyParser());

// Collections
var collections = require('./routes/collections');
server.get('/_admin/collections', collections.list);
server.put(/\/_admin\/collection\/([A-Za-z0-9_-]+)/, collections.create);

// Records
var records = require('./routes/records');
server.get(/\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)/, records.get);
server.post(/\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)/, records.update);
server.del(/\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)/, records.del);
server.put(/\/([A-Za-z0-9_-]+)/, records.create);
server.get(/\/([A-Za-z0-9_-]+)/, records.list);

server.listen(process.env.PORT || 3000, function () {
 console.log('%s is listening at %s', server.name, server.url);            
});
