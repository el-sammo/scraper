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
	var fromFile = false;
	return fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data) {
		if(!err) {
			fromFile = true;
			transformed = transform(data, fromFile);
			return load(transformed);
		} else {
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
						transformed = transform(data, fromFile);
						return load(transformed);
					}
				}); 
			});
		}
	});
}

function transform(data, fromFile) {
	var parsed;
	if(fromFile) {
		parsed = JSON.parse(data);
	} else {
		parsed = data;
	}

console.log(' ');
console.log('parsed.races[0]:');
console.log(parsed.races[0]);
	var track = {};
	track.name = getName(parsed.races[0].raceKey.trackId);
	track.races = [];

	parsed.races.forEach(function(race) {
		var thisRace = {};
		thisRace.number = race.raceKey.raceNumber;
		thisRace.distance = race.distanceValue;
		thisRace.formattedDistance = convertDist(race.distanceValue);
		thisRace.surface = race.surfaceDescription;

		postTimeMills = getPostTimeMills(race.postTime);
		// time and formattedTime are UTC (EST + 4 hours)
		thisRace.postTime = postTimeMills;
//		formattedTime: '17:30',
//		sexes: 'Open',
//		ages: '2 Year Olds',
//		type: 'Maiden Special Weight',
//		claim: 0,
//		purse: 75000,
//		wagers: [
		track.races.push(thisRace);
	});
console.log(' ');
console.log('track:');
console.log(track);
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

function getName(code) {
	var nameMap = [];
	nameMap['PRX'] = 'Parx';
	return nameMap[code];
}

function convertDist(dist) {
	var distMap = [];
	distMap[.5625] = '4 1/2F',
	distMap[.625] = '5F',
	distMap[.6875] = '5 1/2F',
	distMap[.75] = '6F',
	distMap[.8125] = '6 1/2F',
	distMap[.875] = '7F',
	distMap[.9375] = '7 1/2F',
	distMap[8] = '1M',
	distMap[1.0625] = '1 1/16M',
	distMap[1.070] = '1M 70Y',
	distMap[1.125] = '1 1/8M',
	distMap[1.25] = '1 1/4M',
	distMap[1.375] = '1 3/8M',
	distMap[1.5] = '1 1/2M',
	distMap[1.625] = '1 5/8M',
	distMap[1.75] = '1 3/4M',
	distMap[1.875] = '1 7/8M',
	distMap[2] = '2M'

	return distMap[dist];
}

function getPostTimeMills(postTime) {
	var raceDatePcs = buildDate().split('-');
	var timePcs = postTime.split(' ');
	var hourMinutePcs = timePcs[0].split(':');
	var hour = parseInt(hourMinutePcs[0]);
	var minute = parseInt(hourMinutePcs[1]);
	var timeDesc = timePcs[1];
	if(timeDesc === 'PM') {
		if(hour < 12) {
			hour = hour + 12;
		}
	}
	var postTimeObj = new Date(
		raceDatePcs[2], 
		raceDatePcs[0],
		raceDatePcs[1],
		hour, 
		minute, 
		0, 
		0
	);
	return postTimeObj.getTime() + 14400000;
}
