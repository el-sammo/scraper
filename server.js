var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();

var tracks = ['DEL'];

tracks.forEach(function(track) {
	
	app.get('/scrape/:id', function(req, res) {
		var raceDate = req.params.id;
		var month = raceDate.substr(0,2);
		var day = raceDate.substr(2,2);
		var year = raceDate.substr(4,4);
	
		url = 'http://www.drf.com/race-entries/track/'+track+'/country/USA/date/'+month+'-'+day+'-'+year;
	
		// The structure of our request call
		// The first parameter is our URL
		// The callback function takes 3 parameters, an error, response status code and the html
		request(url, function(error, response, html) {
	
			// First we'll check to make sure no errors occurred when making the request
			if(!error) {
	
				// Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
				var $ = cheerio.load(html);

				var track = {}
				track.raceDate = parseInt(year+month+day);
	
				// Track Data
				//	#entriesDetailsWrapper
				// 		div
				// 			.entriesHeader
				// 				.entriesDtlsLeft
				// 					h4
				$('#entriesDetailsWrapper').filter(function() {
					var data = $(this);
console.log(' ');
console.log('data:');
console.log(data);
console.log(' ');
				});

				// Races Data
				// 	#entriesDetailsWrapper
				// 		.entriesRaceDtls
				$('#entriesDetailsWrapper').filter(function() {
					$('.entriesRaceDtls').filter(function() {
						var race = {};
						$('.raceHeader').filter(function() {
							$('.entriesRaceHeader').filter(function() {
								$('.raceHeaderDtl').filter(function() {
									$('h3').filter(function() {
										var data = $(this);
										race.number = data.text().substr(5);
									});
								});
							});
						});
						track.races.push(race);
					});
				})
	
console.log(' ');
console.log('track:');
console.log(track);
console.log(' ');
			} else {
console.log(' ');
consol.elog('error:');
consol.elog(error);
console.log(' ');
			}
		})
	})
})
	
app.listen('7277')

console.log('Magic happens on port 7277');
	
exports = module.exports = app;
