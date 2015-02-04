var util = require('util');
var osm_boundaries = require('./');
var logger = require('./src/util/logger');
var config = require('pelias-config').generate();

logger.info(util.format(
  'Extracting boundaries from %s file %s into %s',
  config.inputType,
  config.inputFile,
  config.outputFile
));

logger.info('Filtering boundaries that match these tags: ', config.filterTags);

osm_boundaries(config, function (err, results) {
  if (err) {
    logger.error(err);
  }
  else {
    logger.info(results);
  }
});



