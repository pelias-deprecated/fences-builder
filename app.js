var util = require('util');
var PolygonExtractor = require('./');
var logger = require('pelias-logger').get('app');
var config = require('pelias-config').generate();

logger.info(util.format(
  'Extracting admin boundaries from %s into %s',
  config.inputFile,
  config.outputDir
));

var extractor = new PolygonExtractor(config);
extractor.start(function (err, results) {
  if (err) {
    logger.error(err);
  }
  else {
    logger.info('Results:', results);
  }
});



