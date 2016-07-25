var rp = require('request-promise');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var config = require('./config');

_.reduce(config.ids, function(p, id) {
	return p.then(function() {
		return extract(id);
	}).catch(function(err) {
		console.error(err);
	});
}, Promise.resolve());


///
// ETL Methods
///

function extract(id) {
	var filePath = config.filePath + id + buildDate();
	return fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
		if(!err) {
console.log(' ');
console.log(filePath + ' found');
			transformed = transform(data);
			return load(transformed);
		} else {
console.log(' ');
console.log(filePath + ' not found');
			var options = {
				uri: buildUrl(id),
				headers: buildHeaders(id),
				json: true,
				gzip: true,
			};

			return rp(options).then(function(data) {
				return fs.writeFile(filePath, JSON.stringify(data), function(err) {
					if(err) {
console.error(err);
						return;
					} else {
						transformed = transform(data);
						return load(transformed);
					}
				}); 
			});
		}
	});
}

function transform(data) {
console.log(' ');
console.log('data:');
console.log(data);

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

