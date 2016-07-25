var rp = require('request-promise');
var Promise = require('bluebird');
var _ = require('lodash');
var config = require('./config');

_.reduce(config.ids, function(p, id) {
	return p.then(function() {
		return extract(id);
	});
}, Promise.resolve());


///
// ETL Methods
///

function extract(id) {
	var options = {
		uri: buildUrl(id),
		headers: buildHeaders(id),
		json: true,
	};

	return rp(options).then(function(data) {
		transformed = transform(data);
		return load(transformed);
	});
}

function transform(data) {
}

function load(data) {
}


///
// Helper methods
///

function buildDate() {
	var mdy = config.mdy;
	return [
		mdy.month,
		mdy.day,
		mdy.year,
	].join('-');
}

function buildUrl(id) {
	var resources = config.resources.api;

	return (
		resources.base + id + resources.extend + buildDate()
	);
}

function buildHeaders(id) {
	var resources = config.resources.referer;
	var headers = _.clone(config.headers);
	headers.Referer = (
		resources.base + id + resources.extend + buildDate()
	);
	return headers;
}

