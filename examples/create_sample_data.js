#!/usr/bin/env node
var request = require('request');
var Faker = require('Faker');
var async = require('async');
var _ = require('underscore');
var clubhouses = [];


var createClubhouse = function () {
  return {
    name: Faker.Company.companyName(),
    url: Faker.Internet.domainName()
  }
}

var tasks = [];

_.times(300, function (n) {
  tasks.push(function (cb) {
    var options = {
      url: 'http://localhost:3000/clubhouses',
        method: 'put',
      json: createClubhouse()
    };

    request(options, function (err, resp, body) {
      if (err) return cb(err);
      clubhouses.push(body);
      cb(null, body);
    });
  });
});

tasks.push(function (cb) {
  var _tasks = [];
  _.times(100000, function (n) {
    var user = Faker.Helpers.userCard();
    user.clubhouse = clubhouses[_.random(0,2)];
    var options = {
      url: 'http://localhost:3000/users',
      method: 'put',
      json: user
    };
    request(options, function (err, resp, body) {
    });
  });
});

async.series(tasks, function (err, results) {
  console.log(results);
});


