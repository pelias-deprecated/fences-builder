var util = require('util');
var openstreetmap_polygons = require('./');
var logger = require('./src/util/logger');
var config = require('pelias-config').generate();

logger.info(util.format(
  'Extracting admin boundaries from %s into %s (error dump: %s)',
  config.inputFile,
  config.outputDir,
  config.errorDump
));

openstreetmap_polygons.extractPolygons(config, function (err, results) {
  if (err) {
    logger.error(err);
  }
  else {
    logger.info(results);
  }
});



