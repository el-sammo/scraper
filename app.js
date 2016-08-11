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
			return load(id, transformed);
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
						return load(id, transformed);
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

	var track = {};
	track.name = getName(parsed.races[0].raceKey.trackId);
	track.premium = getPremium(parsed.races[0].raceKey.trackId);
	
	var datePcs = buildDate().split('-');
	track.raceDate = parseInt(datePcs[2] + datePcs[0] + datePcs[1]);
	track.races = [];

	parsed.races.forEach(function(race) {
		var thisRace = {};
		thisRace.number = race.raceKey.raceNumber;
		thisRace.distance = race.distanceDescription;
		thisRace.surface = race.surfaceDescription;

		var postTimeMills = getPostTimeMills(race.postTime);
console.log('postTimeMills: '+postTimeMills);

		thisRace.postTime = postTimeMills;

		thisRace.sexes = race.sexRestrictionDescription;
		thisRace.ages = race.ageRestrictionDescription;
		thisRace.type = race.raceTypeDescription;
		thisRace.minClaim = race.minClaimPrice;
		thisRace.maxClaim = race.maxClaimPrice;
		thisRace.purse = race.purse;
		thisRace.wagers = [
			{
				wager: 'Win',
				abbrev: 'Win',
				min: 2
			},
			{
				wager: 'Place',
				abbrev: 'Place',
				min: 2
			},
			{
				wager: 'Show',
				abbrev: 'Show',
				min: 2
			}
		];

		var exaOnePos = race.wagerText.indexOf('$1 Exacta');
		var EXAOnePos = race.wagerText.indexOf('$1 EXACTA');
		var exaPos = race.wagerText.indexOf('Exacta');
		var EXAPos = race.wagerText.indexOf('EXACTA');
		var exacta = {abbrev: 'Exacta', wager: 'Exacta'}
		if(
			exaOnePos > -1 || 
			EXAOnePos > -1
		) {
			exacta.min = 1;
			thisRace.wagers.push(exacta);
		} else {
			if(
				exaPos > -1 || 
				EXAPos > -1
			) {
				exacta.min = 2;
				thisRace.wagers.push(exacta);
			}
		}

		var triMinPointFiftyPos = race.wagerText.indexOf('Trifecta (min .50 cent)');
		var triPointFiftyPos = race.wagerText.indexOf('50 Trifecta');
		var triParenFiftyHyphenPos = race.wagerText.indexOf('Trifecta (50-cent min');
		var triParenFiftyPointHyphenPos = race.wagerText.indexOf('Trifecta (50-cent. min.)');
		var triHyphenPointFiftyPos = race.wagerText.indexOf('50-Cent Trifecta');
		var triNoHyphenPointFiftyPos = race.wagerText.indexOf('50 Cent Trifecta');
		var triCommaPointFiftyPos = race.wagerText.indexOf('Trifecta (.50),');
		var triFiftyPos = race.wagerText.indexOf('50 cent Trifecta');
		var triPos = race.wagerText.indexOf('Trifecta');
		var TRIPos = race.wagerText.indexOf('TRIFECTA');
		var trifecta = {abbrev: 'Tri', wager: 'Trifecta'}
		if(
			triMinPointFiftyPos > -1 || 
			triFiftyPos > -1 || 
			triPointFiftyPos > -1 || 
			triParenFiftyHyphenPos > -1 || 
			triParenFiftyPointHyphenPos > -1 || 
			triCommaPointFiftyPos > -1 || 
			triHyphenPointFiftyPos > -1 ||
			triNoHyphenPointFiftyPos > -1
		) {
			trifecta.min = .5;
			thisRace.wagers.push(trifecta);
		} else {
			if(
				triPos > -1 || 
				TRIPos > -1
			) {
				trifecta.min = 1;
				thisRace.wagers.push(trifecta);
			}
		}

		var supMinPointTenPos = race.wagerText.indexOf('Superfecta (min .10 cent)');
		var supParenTenPos = race.wagerText.indexOf('Superfecta (10-cent min)');
		var supParenPeriodTenPos = race.wagerText.indexOf('Superfecta (10-cent min.)');
		var SUPParenTenPos = race.wagerText.indexOf('SUPERFECTA (10 Cent Minimum)');
		var supLongTenPos = race.wagerText.indexOf('Superfecta (.10 cent minimum)');
		var supHyphenTenPos = race.wagerText.indexOf('10-Cent Superfecta');
		var supCommaTenPos = race.wagerText.indexOf('Super (.10)');
		var supPointTenPos = race.wagerText.indexOf('10 Superfecta');
		var supTenPos = race.wagerText.indexOf('10 cent Superfecta');
		var SupTenPos = race.wagerText.indexOf('10 cent Super');
		var supParenPointFiftyPos = race.wagerText.indexOf('($.50) Superfecta');
		var supParenFiftyPos = race.wagerText.indexOf('Superfecta (50-cent min)');
		var supPointFiftyPos = race.wagerText.indexOf('50 Superfecta');
		var supFiftyPos = race.wagerText.indexOf('50 cent Superfecta');
		var SupFiftyPos = race.wagerText.indexOf('50 cent Super');
		var supPos = race.wagerText.indexOf('Superfecta');
		var SupPos = race.wagerText.indexOf('Super');
		var SUPPos = race.wagerText.indexOf('SUPERFECTA');
		var superfecta = {abbrev: 'Super', wager: 'Superfecta'}
		if(
			supMinPointTenPos > -1 || 
			supTenPos > -1 || 
			SupTenPos > -1 || 
			supCommaTenPos > -1 ||
			supHyphenTenPos > -1 ||
			supPointTenPos > -1 || 
			supParenPeriodTenPos > -1 || 
			SUPParenTenPos > -1 || 
			supLongTenPos > -1 || 
			supParenTenPos > -1
		) {
			superfecta.min = .1;
			thisRace.wagers.push(superfecta);
		} else {
			if(
				supFiftyPos > -1 || 
				SupFiftyPos > -1 || 
				supPointFiftyPos > -1 || 
				supParenPointFiftyPos > -1 || 
				supParenFiftyPos > -1
			) {
				superfecta.min = .5;
				thisRace.wagers.push(superfecta);
			} else {
				if(supPos > -1 || SupPos > -1 || SUPPos > -1) {
					superfecta.min = 1;
					thisRace.wagers.push(superfecta);
				}
			}
		}

		var penPointTenPos = race.wagerText.indexOf('10 Pentafecta');
		var penTenPos = race.wagerText.indexOf('10 cent Pentafecta');
		var supH5TenPos = race.wagerText.indexOf('10 cent Super High Five');
		var shfTenPos = race.wagerText.indexOf('10 cent SHF');
		var sh5TenPos = race.wagerText.indexOf('10 cent SH5');
		var penPointFiftyPos = race.wagerText.indexOf('50 Pentafecta');
		var penFiftyPos = race.wagerText.indexOf('50 cent Pentafecta');
		var supH5FiftyPos = race.wagerText.indexOf('50 cent Super High Five');
		var shfFiftyPos = race.wagerText.indexOf('50 cent SHF');
		var sh5FiftyPos = race.wagerText.indexOf('50 cent SH5');
		var sfFiftyPos = race.wagerText.indexOf('($.50) Super Five');
		var penPos = race.wagerText.indexOf('Pentafecta');
		var PENPos = race.wagerText.indexOf('PENTAFECTA');
		var supH5Pos = race.wagerText.indexOf('Super High Five');
		var SUPH5Pos = race.wagerText.indexOf('SUPER HIGH FIVE');
		var shfPos = race.wagerText.indexOf('shf');
		var SHFPos = race.wagerText.indexOf('SHF');
		var sh5Pos = race.wagerText.indexOf('sh5');
		var SH5Pos = race.wagerText.indexOf('SH5');
		var SupHi5Pos = race.wagerText.indexOf('Super Hi 5');
		var Sup1Hi5Pos = race.wagerText.indexOf('1 Super Hi 5');
		var Sup1High5Pos = race.wagerText.indexOf('$1 Super High 5');
		var pentafecta = {abbrev: 'SH5', wager: 'Pentafecta'}
		if(
			penPointTenPos > -1 ||
			penTenPos > -1 ||
			supH5TenPos > -1 ||
			shfTenPos > -1 ||
			sh5TenPos > -1
		) {
			pentafecta.min = .1;
			thisRace.wagers.push(pentafecta);
		} else {
			if(
				penPointFiftyPos > -1 ||
				penFiftyPos > -1 ||
				supH5FiftyPos > -1 ||
				shfFiftyPos > -1 ||
				sfFiftyPos > -1 ||
				sh5FiftyPos > -1
			) {
				pentafecta.min = .5;
				thisRace.wagers.push(pentafecta);
			} else {
				if(
					SupHi5Pos > - 1 ||
					Sup1Hi5Pos > - 1 ||
					Sup1High5Pos > - 1 ||
					penPos > -1 || PENPos > -1 ||
					supH5Pos > -1 || SUPH5Pos > -1 ||
					shfPos > -1 || SHFPos > -1 ||
					sh5Pos > -1 || SH5Pos > -1 
				) {
					pentafecta.min = 1;
					thisRace.wagers.push(pentafecta);
				}
			}
		}

		// checking for confusing language
		var secondHalfDDPos = race.wagerText.indexOf('Second Half Daily Double');  // <-- this isn't catching for Parx (for instance)
		var secondHalfDaiPos = race.wagerText.indexOf('Second Half of Middle Daily Double');
		var secondHalfEarlyDaiPos = race.wagerText.indexOf('Second Half $2 Early Daily Double');

		var dai2EarlyPos = race.wagerText.indexOf('$2 Early Daily Double');
		var dai2RollPos = race.wagerText.indexOf('$2 Rolling Double');
		var dai2DDPos = race.wagerText.indexOf('$2 Daily Double');
		var daiPos = race.wagerText.indexOf('Double');
		var DAIPos = race.wagerText.indexOf('DOUBLE');
		var ddPos = race.wagerText.indexOf('dd');
		var DDPos = race.wagerText.indexOf('DD');
		var daily = {abbrev: 'DD', wager: 'Daily Double'}
		if(
			daiPos > -1 || 
			DAIPos > -1 ||
			ddPos > -1 ||
			DDPos > -1
			&& dai2EarlyPos < 0 // <-- making sure we aren't finding bad language
			&& dai2RollPos < 0 // <-- making sure we arent overlapping
			&& dai2DDPos < 0 // <-- making sure we arent overlapping
			&& secondHalfDDPos < 0 // <-- making sure we aren't finding bad language
			&& secondHalfDaiPos < 0 // <-- making sure we aren't finding bad language
			&& secondHalfEarlyDaiPos < 0 // <-- making sure we aren't finding bad language
		) {
			daily.min = 1;
			thisRace.wagers.push(daily);
		} else {
			if(
				dai2EarlyPos > -1 ||
				dai2RollPos > -1 ||
				dai2DDPos > -1
				&& secondHalfDDPos < 0 // <-- making sure we aren't finding bad language
				&& secondHalfDaiPos < 0 // <-- making sure we aren't finding bad language
				&& secondHalfEarlyDaiPos < 0 // <-- making sure we aren't finding bad language
			) {
				daily.min = 2;
				thisRace.wagers.push(daily);
			}
		}


		var pic3TwentyPos = race.wagerText.indexOf('20 cent Pick 3');
		var p3TwentyPos = race.wagerText.indexOf('20 cent P3');
		var pThrTwentyPos = race.wagerText.indexOf('20 cent Pick Three');
		var pic3Paren123FiftyPos = race.wagerText.indexOf('Pick 3 (Races 1-2-3, 50-cent min');
		var pic3Paren234FiftyPos = race.wagerText.indexOf('Pick 3 (Races 2-3-4, 50-cent min');
		var pic3Paren345FiftyPos = race.wagerText.indexOf('Pick 3 (Races 3-4-5, 50-cent min');
		var pic3Paren456FiftyPos = race.wagerText.indexOf('Pick 3 (Races 4-5-6, 50-cent min');
		var pic3Paren567FiftyPos = race.wagerText.indexOf('Pick 3 (Races 5-6-7, 50-cent min');
		var pic3Paren678FiftyPos = race.wagerText.indexOf('Pick 3 (Races 6-7-8, 50-cent min');
		var pic3Paren789FiftyPos = race.wagerText.indexOf('Pick 3 (Races 7-8-9, 50-cent min');
		var pic3ParenPointFiftyPos = race.wagerText.indexOf('Pick 3 (min .50 cent)');
		var pic3HyphenFiftyPos = race.wagerText.indexOf('50-Cent Pick 3');
		var pic3ParenFiftyPos = race.wagerText.indexOf('Pick 3 (.50)');
		var pic3ParenFiftyMinPos = race.wagerText.indexOf('PICK 3 (50 Cent Minimum');
		var pic3FiftyPos = race.wagerText.indexOf('50 cent Pick 3');
		var p3FiftyPos = race.wagerText.indexOf('50 cent P3');
		var pThrFiftyPos = race.wagerText.indexOf('50 cent Pick Three');
		var pic3Pos = race.wagerText.indexOf('Pick 3');
		var PIC3Pos = race.wagerText.indexOf('PICK 3');
		var p3Pos = race.wagerText.indexOf('P3');
		var pThrPos = race.wagerText.indexOf('Pick Three');
		var PTHRPos = race.wagerText.indexOf('PICK THREE');
		var bet3Pos = race.wagerText.indexOf('1 Bet 3');
		var pick3 = {abbrev: 'P3', wager: 'Pick 3'}
		if(
			pic3TwentyPos > -1 ||
			p3TwentyPos > -1 ||
			pThrTwentyPos > -1
		) {
			pick3.min = .2;
			thisRace.wagers.push(pick3);
		} else {
			if(
				pic3Paren123FiftyPos > -1 ||
				pic3Paren234FiftyPos > -1 ||
				pic3Paren345FiftyPos > -1 ||
				pic3Paren456FiftyPos > -1 ||
				pic3Paren567FiftyPos > -1 ||
				pic3Paren678FiftyPos > -1 ||
				pic3Paren789FiftyPos > -1 ||
				pic3ParenPointFiftyPos > -1 ||
				pic3FiftyPos > -1 ||
				p3FiftyPos > -1 ||
				pic3HyphenFiftyPos > -1 ||
				pic3ParenFiftyPos > -1 ||
				pic3ParenFiftyMinPos > -1 ||
				pThrFiftyPos > -1
			) {
				pick3.min = .5;
				thisRace.wagers.push(pick3);
			} else {
				if(
					pic3Pos > -1 || PIC3Pos > -1 ||
					p3Pos > -1 || bet3Pos > -1 ||
					pThrPos > -1 || PTHRPos > -1
				) {
					pick3.min = 1;
					thisRace.wagers.push(pick3);
				}
			}
		}

		var pic4TwentyPos = race.wagerText.indexOf('20 cent Pick 4');
		var p4TwentyPos = race.wagerText.indexOf('20 cent P4');
		var pFrTwentyPos = race.wagerText.indexOf('20 cent Pick Four');
		var pic4Paren1234FiftyPos = race.wagerText.indexOf('Pick 4 (Races 1-2-3-4, 50-cent min');
		var pic4Paren2345FiftyPos = race.wagerText.indexOf('Pick 4 (Races 2-3-4-5, 50-cent min');
		var pic4Paren3456FiftyPos = race.wagerText.indexOf('Pick 4 (Races 3-4-5-6, 50-cent min');
		var pic4Paren4567FiftyPos = race.wagerText.indexOf('Pick 4 (Races 4-5-6-7, 50-cent min');
		var pic4Paren5678FiftyPos = race.wagerText.indexOf('Pick 4 (Races 5-6-7-8, 50-cent min');
		var pic4Paren6789FiftyPos = race.wagerText.indexOf('Pick 4 (Races 6-7-8-9, 50-cent min');
		var pic4Paren78910FiftyPos = race.wagerText.indexOf('Pick 4 (Races 7-8-9-10, 50-cent min');
		var pic4ParenPointFiftyPos = race.wagerText.indexOf('Pick 4 (min .50 cent)');
		var pic4HyphenPointFiftyPos = race.wagerText.indexOf('($.50) Pick 4');
		var pic4HyphenFiftyPos = race.wagerText.indexOf('50-Cent Pick 4');
		var pic4ParenFiftyPos = race.wagerText.indexOf('Pick 4 (.50)');
		var pic4ParenFiftyMinPos = race.wagerText.indexOf('PICK 4 (50 Cent Minimum');
		var pic4FiftyPos = race.wagerText.indexOf('50 cent Pick 4');
		var p4FiftyPos = race.wagerText.indexOf('50 cent P4');
		var pFrFiftyPos = race.wagerText.indexOf('50 cent Pick Four');
		var p4PointFiftyPos = race.wagerText.indexOf('50 Pick 4');
		var pic4Pos = race.wagerText.indexOf('Pick 4');
		var PIC4Pos = race.wagerText.indexOf('PICK 4');
		var p4Pos = race.wagerText.indexOf('P4');
		var pFrPos = race.wagerText.indexOf('Pick Four');
		var PFRPos = race.wagerText.indexOf('PICK FOUR');
		var pick4 = {abbrev: 'P4', wager: 'Pick 4'}
		if(
			pic4TwentyPos > -1 ||
			p4TwentyPos > -1 ||
			pFrTwentyPos > -1
		) {
			pick4.min = .2;
			thisRace.wagers.push(pick4);
		} else {
			if(
				pic4Paren1234FiftyPos > -1 ||
				pic4Paren2345FiftyPos > -1 ||
				pic4Paren3456FiftyPos > -1 ||
				pic4Paren4567FiftyPos > -1 ||
				pic4Paren5678FiftyPos > -1 ||
				pic4Paren6789FiftyPos > -1 ||
				pic4Paren78910FiftyPos > -1 ||
				pic4ParenPointFiftyPos > -1 ||
				pic4HyphenPointFiftyPos > -1 ||
				p4PointFiftyPos > -1 ||
				pic4FiftyPos > -1 ||
				p4FiftyPos > -1 ||
				pic4HyphenFiftyPos > -1 ||
				pic4ParenFiftyPos > -1 ||
				pic4ParenFiftyMinPos > -1 ||
				pFrFiftyPos > -1
			) {
				pick4.min = .5;
				thisRace.wagers.push(pick4);
			} else {
				if(
					pic4Pos > -1 || PIC4Pos > -1 ||
					p4Pos > -1 ||
					pFrPos > -1 || PFRPos > -1
				) {
					pick4.min = 1;
					thisRace.wagers.push(pick4);
				}
			}
		}

		var pic5TwentyPos = race.wagerText.indexOf('20 cent Pick 5');
		var p5TwentyPos = race.wagerText.indexOf('20 cent P5');
		var pFivTwentyPos = race.wagerText.indexOf('20 cent Pick Five');
		var pic5HyphenFiftyCPos = race.wagerText.indexOf('50-Cent Pick 5');
		var pic5HyphenFiftycPos = race.wagerText.indexOf('50-cent Pick 5');
		var pic5ParenWCOFiftyPos = race.wagerText.indexOf('PICK 5 WITH CARRYOVER (50 Cent Minimum');
		var pic5ParenWOCOFiftyPos = race.wagerText.indexOf('PICK 5 (50 Cent Minimum');
		var pic5FiftyPos = race.wagerText.indexOf('50 cent Pick 5');
		var p5FiftyPos = race.wagerText.indexOf('50 cent P5');
		var pFivFiftyPos = race.wagerText.indexOf('50 cent Pick Five');
		var p5PointFiftyPos = race.wagerText.indexOf('50 Pick 5');
		var p5ParenPointFiftyPos = race.wagerText.indexOf('($.50) Pick 5');
		var p5ParentPointFiftyPos = race.wagerText.indexOf('Pick 5 ( min .50 cent)');
		var pic5Pos = race.wagerText.indexOf('Pick 5');
		var PIC5Pos = race.wagerText.indexOf('PICK 5');
		var p5Pos = race.wagerText.indexOf('P5');
		var pFivPos = race.wagerText.indexOf('Pick Five');
		var PFIVPos = race.wagerText.indexOf('PICK FIVE');
		var pick5 = {abbrev: 'P5', wager: 'Pick 5'}
		if(
			pic5TwentyPos > -1 ||
			p5TwentyPos > -1 ||
			pFivTwentyPos > -1
		) {
			pick5.min = .2;
			thisRace.wagers.push(pick5);
		} else {
			if(
				p5PointFiftyPos > -1 ||
				pic5FiftyPos > -1 ||
				p5FiftyPos > -1 ||
				pic5HyphenFiftyCPos > -1 ||
				pic5HyphenFiftycPos > -1 ||
				pic5ParenWCOFiftyPos > -1 ||
				pic5ParenWOCOFiftyPos > -1 ||
				p5ParenPointFiftyPos > -1 ||
				p5ParentPointFiftyPos > -1 ||
				pFivFiftyPos > -1
			) {
				pick5.min = .5;
				thisRace.wagers.push(pick5);
			} else {
				if(
					pic5Pos > -1 || PIC5Pos > -1 ||
					p5Pos > -1 ||
					pFivPos > -1 || PFIVPos > -1
				) {
					pick5.min = 1;
					thisRace.wagers.push(pick5);
				}
			}
		}

		var pic6TwentyPos = race.wagerText.indexOf('20 cent Pick 6');
		var pic6HyphenTwentyPos = race.wagerText.indexOf('20-Cent Jersey Shore 6');
		var p6TwentyPos = race.wagerText.indexOf('20 cent P6');
		var pSixTwentyPos = race.wagerText.indexOf('20 cent Pick Six');
		var pSixRainbowTwentyPos = race.wagerText.indexOf('20 Rainbow Pick 6');
		var pic6FiftyPos = race.wagerText.indexOf('50 cent Pick 6');
		var p6FiftyPos = race.wagerText.indexOf('50 cent P6');
		var pSixFiftyPos = race.wagerText.indexOf('50 cent Pick Six');
		var pic6OnePos = race.wagerText.indexOf('$1 Pick 6');
		var PIC6OnePos = race.wagerText.indexOf('$1 PICK 6');
		var p6OnePos = race.wagerText.indexOf('$1 P6');
		var pSixOnePos = race.wagerText.indexOf('$1 Pick Six');
		var PSIXOnePos = race.wagerText.indexOf('$1 PICK SIX');
		var pic6Pos = race.wagerText.indexOf('Pick 6');
		var PIC6Pos = race.wagerText.indexOf('PICK 6');
		var p6Pos = race.wagerText.indexOf('P6');
		var pSixPos = race.wagerText.indexOf('Pick Six');
		var PSIXPos = race.wagerText.indexOf('PICK SIX');
		var pick6 = {abbrev: 'P6', wager: 'Pick 6'}
		if(
			pSixRainbowTwentyPos > -1 ||
			pic6TwentyPos > -1 ||
			p6TwentyPos > -1 ||
			pic6HyphenTwentyPos > -1 ||
			pSixTwentyPos > -1
		) {
			pick6.min = .2;
			thisRace.wagers.push(pick6);
		} else {
			if(
				pic6FiftyPos > -1 ||
				p6FiftyPos > -1 ||
				pSixFiftyPos > -1
			) {
				pick6.min = .5;
				thisRace.wagers.push(pick6);
			} else {
				if(
					pic6OnePos > -1 || PIC6OnePos > -1 ||
					p6OnePos > -1 ||
					pSixOnePos > -1 || PSIXOnePos > -1
				) {
					pick6.min = 1;
					thisRace.wagers.push(pick6);
				} else {
					if(
						pic6Pos > -1 || PIC6Pos > -1 ||
						p6Pos > -1 ||
						pSixPos > -1 || PSIXPos > -1
					) {
						pick6.min = 2;
						thisRace.wagers.push(pick6);
					}
				}
			}
		}

		thisRace.entries = [];
		var coupled = [];
		race.runners.forEach(function(runner) {
			if(coupled.indexOf(runner.coupledType) < 0) {
				var thisRunner = {};
				thisRunner.number = runner.programNumberStripped;
				thisRunner.post = runner.postPos;

				var active = true;
				if(runner.programNumberStripped.toString() === '-1') {
					active = false;
				}

				thisRunner.active = active;
				thisRunner.name = runner.horseName;
				if(active) {
					thisRunner.jockey = runner.jockey.firstNameInitial + '. ' + runner.jockey.lastName;
					thisRunner.trainer = runner.trainer.firstNameInitial + '. ' + runner.trainer.lastName;
					thisRunner.weight = runner.weight;
					thisRunner.ml = runner.morningLineOdds;
				} else {
					thisRunner.jockey = 'SCRATCHED';
					thisRunner.trainer = 'SCRATCHED';
					thisRunner.weight = '';
					thisRunner.ml = '-';
				}
				thisRunner.claim = runner.ClaimingDisplay;
				thisRunner.meds = runner.medication;
				thisRunner.equip = runner.equipment;

				if(runner.coupledType) {
					thisRunner.coupledType = runner.coupledType;
					race.runners.forEach(function(altRunner) {
						if((thisRunner.coupledType === altRunner.coupledType) &&
						(thisRunner.programNumber !== altRunner.programNumber)) {
							thisRunner.altRunner = {};
							thisRunner.altRunner.number = altRunner.programNumber;
							thisRunner.altRunner.post = altRunner.postPos;

							var active = true;
							if(altRunner.scratchIndicator !== 'N') {
								active = false;
							}

							thisRunner.altRunner.active = active;
							thisRunner.altRunner.name = altRunner.horseName;
							thisRunner.altRunner.jockey = altRunner.jockey.firstNameInitial + '. ' + altRunner.jockey.lastName;
							thisRunner.altRunner.weight = altRunner.weight;
							thisRunner.altRunner.trainer = altRunner.trainer.firstNameInitial + '. ' + altRunner.trainer.lastName;
							thisRunner.altRunner.claim = altRunner.ClaimingDisplay;
							thisRunner.altRunner.meds = altRunner.medication;
							thisRunner.altRunner.equip = altRunner.equipment;
							thisRunner.altRunner.ml = altRunner.morningLineOdds;
							coupled.push(runner.coupledType);
						}
					});
				}
				thisRace.entries.push(thisRunner);
			}
		});

		thisRace.closed = false;

		track.races.push(thisRace);
	});
	return track;
}

function load(id, data) {
	var filePath = config.filePath + '../load.js';

	var fileContents = '';

	fileContents += 'var customers = [\n';
	fileContents += '  \'57a37668bc6bda21e53012d4\',\n';
	fileContents += '  \'57a37668bc6bda21e53012ee\',\n';
	fileContents += '  \'57a37668bc6bda21e5301335\',\n';
	fileContents += '  \'57a37668bc6bda21e530135e\',\n';
	fileContents += '  \'57a37668bc6bda21e5301393\',\n';
	fileContents += '  \'57a37669bc6bda21e530140e\',\n';
	fileContents += '  \'57a37669bc6bda21e5301453\',\n';
	fileContents += '  \'57a37669bc6bda21e5301455\',\n';
	fileContents += '  \'57a37669bc6bda21e530146d\',\n';
	fileContents += '  \'57a37669bc6bda21e530149c\',\n';
	fileContents += '  \'57a37669bc6bda21e5301504\',\n';
	fileContents += '  \'57a37668bc6bda21e53013ad\',\n';
	fileContents += '  \'57a37668bc6bda21e53013ae\',\n';
	fileContents += '  \'57a37669bc6bda21e53013cc\',\n';
	fileContents += '  \'57a37669bc6bda21e53013cd\',\n';
	fileContents += '  \'57a37669bc6bda21e53013ce\',\n';
	fileContents += '  \'57a37669bc6bda21e53013cf\',\n';
	fileContents += '  \'57a37669bc6bda21e530149b\',\n';
	fileContents += '  \'57a37669bc6bda21e53013d8\',\n';
	fileContents += '  \'57a37669bc6bda21e5301730\',\n';
	fileContents += '  \'57a37669bc6bda21e530173d\',\n';
	fileContents += '  \'57a37669bc6bda21e530173e\',\n';
	fileContents += '  \'57a37669bc6bda21e530173f\',\n';
	fileContents += '  \'57a37669bc6bda21e5301740\',\n';
	fileContents += '  \'57a37669bc6bda21e5301741\',\n';
	fileContents += '  \'57a37669bc6bda21e5301742\',\n';
	fileContents += '  \'57a3766abc6bda21e5301956\',\n';
	fileContents += '  \'57a3766abc6bda21e5301957\',\n';
	fileContents += '  \'57a3766abc6bda21e5301958\',\n';
	fileContents += '  \'57a3766abc6bda21e53019e9\',\n';
	fileContents += '  \'57a3766abc6bda21e53019ea\',\n';
	fileContents += '  \'57a3766abc6bda21e53019eb\',\n';
	fileContents += '  \'57a3766abc6bda21e53019ec\',\n';
	fileContents += '  \'57a3766abc6bda21e5301a0b\',\n';
	fileContents += '  \'57a3766abc6bda21e5301a0c\',\n';
	fileContents += '  \'57a3766abc6bda21e5301a0d\',\n';
	fileContents += '  \'57a3766abc6bda21e5301a0e\',\n';
	fileContents += '];\n';
	fileContents += '\n';

	fileContents += 'var customersCredits = [\n';
	fileContents += '  {customerId: \'57a37668bc6bda21e53012d4\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37668bc6bda21e53012ee\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37668bc6bda21e5301335\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37668bc6bda21e530135e\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37668bc6bda21e5301393\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e530140e\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e5301453\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e5301455\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e530146d\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e530149c\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e5301504\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37668bc6bda21e53013ad\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37668bc6bda21e53013ae\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e53013cc\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e53013cd\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e53013ce\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e53013cf\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e530149b\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e53013d8\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e5301730\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e530173d\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e530173e\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e530173f\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e5301740\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e5301741\', credits: 500},\n';
	fileContents += '  {customerId: \'57a37669bc6bda21e5301742\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e5301956\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e5301957\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e5301958\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e53019e9\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e53019ea\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e53019eb\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e53019ec\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e5301a0b\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e5301a0c\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e5301a0d\', credits: 500},\n';
	fileContents += '  {customerId: \'57a3766abc6bda21e5301a0e\', credits: 500},\n';
	fileContents += '];\n';
	fileContents += '\n';

	fileContents += 'db = new Mongo().getDB(\'horse\');\n';
	fileContents += 'db.trds.insert('+JSON.stringify(data)+');\n';
	fileContents += '\n';

	fileContents += 'var assocId = \'\';\n';
	fileContents += 'var tournamentName = \'\';\n';
	fileContents += 'var tournyDate = \'\';\n';
	fileContents += 'var cursor = db.trds.find({name: \''+data.name+'\', raceDate: '+data.raceDate+'});\n';
	fileContents += '\n';

	fileContents += 'while(cursor.hasNext()) {\n';
	fileContents += '  var trdData = cursor.next();\n';
	fileContents += '  var trackId = trdData._id;\n';
	fileContents += '  var trackPremium = trdData.premium;\n';
	fileContents += '  assocId = trackId.str;\n';
	fileContents += '  var startTime = trdData.races[0].postTime;\n';
	fileContents += '  var assocTrackId = assocId;\n';
	fileContents += '  tournyDate = trdData.raceDate;\n';
	fileContents += '  tournamentName = trdData.name + \' Daily\';\n';
	fileContents += '  var tournamentMax = 100;\n';
	fileContents += '  var entryFee = 10;\n';
	fileContents += '  var siteFee = 1;\n';
	fileContents += '  var closed = false;\n';
	fileContents += '\n';

	fileContents += '  db.tournaments.insert({\n';
	fileContents += '    assocTrackId: assocTrackId,\n';
	fileContents += '    name: tournamentName,\n';
	fileContents += '    premium: trackPremium,\n';
	fileContents += '    tournyDate: tournyDate,\n';
	fileContents += '    max: tournamentMax,\n';
	fileContents += '    entryFee: entryFee,\n';
	fileContents += '    siteFee: siteFee,\n';
	fileContents += '    startTime: startTime,\n';
	fileContents += '    closed: closed,\n';
	fileContents += '    customers: customers,\n';
	fileContents += '    credits: 500,\n';
	fileContents += '    pubPriv: \'public\'\n';
	fileContents += '  });\n';
	fileContents += '\n';

	fileContents += '  tournamentName = trdData.name + \' Limited\';\n';
	fileContents += '  var tournamentMax = 5;\n';
	fileContents += '  var entryFee = 25;\n';
	fileContents += '  var siteFee = 2.5;\n';
	fileContents += '  var closed = false;\n';
	fileContents += '\n';

	fileContents += '  db.tournaments.insert({\n';
	fileContents += '    assocTrackId: assocTrackId,\n';
	fileContents += '    name: tournamentName,\n';
	fileContents += '    tournyDate: tournyDate,\n';
	fileContents += '    max: tournamentMax,\n';
	fileContents += '    entryFee: entryFee,\n';
	fileContents += '    siteFee: siteFee,\n';
	fileContents += '    startTime: startTime,\n';
	fileContents += '    closed: closed,\n';
	fileContents += '    customers: customers,\n';
	fileContents += '    credits: 500,\n';
	fileContents += '    pubPriv: \'public\'\n';
	fileContents += '  });\n';
	fileContents += '\n';

	fileContents += '  tournamentName = trdData.name + \' Open\';\n';
	fileContents += '  var tournamentMax = 99999;\n';
	fileContents += '  var entryFee = 5;\n';
	fileContents += '  var siteFee = .5;\n';
	fileContents += '  var closed = false;\n';
	fileContents += '\n';

	fileContents += '  db.tournaments.insert({\n';
	fileContents += '    assocTrackId: assocTrackId,\n';
	fileContents += '    name: tournamentName,\n';
	fileContents += '    tournyDate: tournyDate,\n';
	fileContents += '    max: tournamentMax,\n';
	fileContents += '    entryFee: entryFee,\n';
	fileContents += '    siteFee: siteFee,\n';
	fileContents += '    startTime: startTime,\n';
	fileContents += '    closed: closed,\n';
	fileContents += '    customers: customers,\n';
	fileContents += '    credits: 500,\n';
	fileContents += '    pubPriv: \'public\'\n';
	fileContents += '  });\n';
	fileContents += '}\n';
	fileContents += '\n';

	fileContents += 'var dailyCursor = db.tournaments.find({name: \''+data.name+' Daily\', tournyDate: '+data.raceDate+'});\n';
	fileContents += '\n';

	fileContents += 'while(dailyCursor.hasNext()) {\n';
	fileContents += '  var tournyData = dailyCursor.next();\n';
	fileContents += '  var tournamentId = tournyData._id.str;\n';
	fileContents += 'print(\'tournamentId: \'+tournamentId);\n';
	fileContents += '  db.tournamentstandings.insert({\n';
	fileContents += '    tournamentId: tournamentId,\n';
	fileContents += '    customers: customersCredits\n';
	fileContents += '  });\n';
	fileContents += '};\n';
	fileContents += '\n';

	fileContents += 'var limitedCursor = db.tournaments.find({name: \''+data.name+' Limited\', tournyDate: '+data.raceDate+'});\n';
	fileContents += '\n';

	fileContents += 'while(limitedCursor.hasNext()) {\n';
	fileContents += '  var tournyData = limitedCursor.next();\n';
	fileContents += '  var tournamentId = tournyData._id.str;\n';
	fileContents += 'print(\'tournamentId: \'+tournamentId);\n';
	fileContents += '  db.tournamentstandings.insert({\n';
	fileContents += '    tournamentId: tournamentId,\n';
	fileContents += '    customers: customersCredits\n';
	fileContents += '  });\n';
	fileContents += '};\n';
	fileContents += '\n';

	fileContents += 'var openCursor = db.tournaments.find({name: \''+data.name+' Open\', tournyDate: '+data.raceDate+'});\n';
	fileContents += '\n';

	fileContents += 'while(openCursor.hasNext()) {\n';
	fileContents += '  var tournyData = openCursor.next();\n';
	fileContents += '  var tournamentId = tournyData._id.str;\n';
	fileContents += 'print(\'tournamentId: \'+tournamentId);\n';
	fileContents += '  db.tournamentstandings.insert({\n';
	fileContents += '    tournamentId: tournamentId,\n';
	fileContents += '    customers: customersCredits\n';
	fileContents += '  });\n';
	fileContents += '};\n';
	fileContents += '\n';


	return fs.writeFile(filePath, fileContents, function(err) {
		if(err) {
return console.log(err);
		} else {
			return;
		}
	}); 
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
	nameMap['AP'] = 'Arlington Park';
	nameMap['CT'] = 'Charles Town';
	nameMap['DEL'] = 'Delaware Park';
	nameMap['DMR'] = 'Del Mar';
	nameMap['EMD'] = 'Emerald Downs';
	nameMap['EVD'] = 'Evangeline Downs';
	nameMap['FL'] = 'Finger Lakes';
	nameMap['GP'] = 'Gulfstream Park';
	nameMap['LA'] = 'Los Alamitos';
	nameMap['LAD'] = 'Louisiana Downs';
	nameMap['MNR'] = 'Mountaineer';
	nameMap['MTH'] = 'Monmouth Park';
	nameMap['PEN'] = 'Penn National';
	nameMap['PID'] = 'Presque Isle';
	nameMap['PRX'] = 'Parx';
	nameMap['SAR'] = 'Saratoga';
	nameMap['SR'] = 'Santa Rosa';
	nameMap['SUF'] = 'Suffolk Downs';
	nameMap['WO'] = 'Woodbine';
	return nameMap[code];
}

function getPremium(code) {
	var premMap = [];
	premMap['AP'] = false;
	premMap['CT'] = false;
	premMap['DEL'] = false;
	premMap['DMR'] = true;
	premMap['EMD'] = false;
	premMap['EVD'] = false;
	premMap['FL'] = false;
	premMap['GP'] = true;
	premMap['LA'] = true;
	premMap['LAD'] = false;
	premMap['MNR'] = false;
	premMap['MTH'] = true;
	premMap['PEN'] = false;
	premMap['PID'] = false;
	premMap['PRX'] = false;
	premMap['SAR'] = true;
	premMap['SR'] = false;
	premMap['SUF'] = false;
	premMap['WO'] = true;
	return premMap[code];
}

function getPostTimeMills(postTime) {
	var datePcs = buildDate().split('-');
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
		datePcs[2], 
		datePcs[0] - 1, // <-- subtract one to account for the date object starting at '0' for month
		datePcs[1],
		hour, 
		minute, 
		0, 
		0
	);
	if(timeDesc === 'AM' && hour > 11) {
		// return milliseconds converted to UTC (EST + 4 hours) + 12 hours
		return postTimeObj.getTime() + 14405000 + 43200000;
	}
	if(timeDesc === 'AM' && hour > 0 && hour < 5) {
		// return milliseconds converted to UTC (EST + 4 hours) + 24 hours
		return postTimeObj.getTime() + 14405000 + 86400000;
	}
	// return milliseconds converted to UTC (EST + 4 hours)
	return postTimeObj.getTime() + 14405000;
}
