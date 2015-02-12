var fs = require('fs');
var path = require('path');
var geojson_stream = require('geojson-stream');
var OSMAreaBuilder = require('./src/OSMAreaBuilder');

/**
 * Process osm file and generate all found polygons containing administrative boundaries.
 * Write polygons to GEOJSON format (other formats coming soon).
 *
 * @param options object
 *   inputFile: path to input file
 *   inputType: input file type (osm, pbj, other osmium supported input format)
 *   outputFile: path to output file, currently GEOJSON, so provide correct extension
 *   errorFile: path to error file, will be json and should be used to help correct errors
 * @param callback function (err, results)
 *   Callback is called with statistics in results parameter
 */
module.exports.extractPolygons = function extractPolygons(options, callback) {

  var filterStats = {
    matched: 0,
    errors: 0
  };

  var errors = [];

  var baseName = path.basename(options.inputFile);
  var extension = path.extname(options.inputFile);

  var outputFilePath = path.join(options.outputDir, baseName + '.geojson');
  var errorFilePath = path.join(options.outputDir, baseName + '.err.json');

  var geojsonStream = geojson_stream.stringify();
  var outputStream = fs.createWriteStream(outputFilePath);

  // setup the output streams
  geojsonStream.pipe(outputStream);

  function _areaCallback(area) {
    if (area.properties.boundary === 'administrative' && area.properties.admin_level) {
      filterStats.matched++;
      geojsonStream.write(area);
    }
  }

  function _errorCallback(err) {
    var area = err.data;
    if (area.properties.boundary === 'administrative') {
      filterStats.errors++;
      errors.push(err);
    }
  }

  var boundaryStream = new OSMAreaBuilder(
    options.inputFile,
    extension,
    _areaCallback,
    _errorCallback
  );

  boundaryStream.on('done', function () {
    // end output stream
    geojsonStream.end();

    // dump errors to file if options indicated an output file
    if (options.errorDump) {
      fs.writeFileSync(errorFilePath, JSON.stringify(errors, null, 2));
    }
  });

  // only register the finish handler if client is waiting to hear back
  if (callback) {
    outputStream.on('finish', function () {
      callback(null, {
        boundary_stream: boundaryStream._stats,
        filter: filterStats
      });
    });
  }

  boundaryStream.start();
};