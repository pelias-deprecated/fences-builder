var fs = require('fs');
var geojsonStream = require('geojson-stream');
var OSMAreaStream = require('./src/OSMAreaStream');
var tag_filter = require('./src/tag_filter');

/**
 * Process osm file and generate all found polygons.
 * Filter the polygons based on specified tags.
 * Write polygons to GEOJSON format (other formats coming soon)
 *
 * @param options object
 *   inputFile: path to input file
 *   inputType: input file type (osm, pbj, other osmium supported input format)
 *   outputFile: path to output file, currently GEOJSON, so provide correct extension
 *   filterTags: {
 *       boundary: { administrative: true },
 *       admin_level: true
 *   }
 * @param callback function (err, results)
 *   Callback is called with statistics in results parameter
 */
module.exports = function extractPolygons(options, callback) {

  var boundaryStream = new OSMAreaStream(options.inputFile, options.inputType);
  var tagFilterStream = tag_filter(options.filterTags);
  var outputStream = fs.createWriteStream(options.outputFile);

  boundaryStream
    .pipe(tagFilterStream)
    .pipe(geojsonStream.stringify())
    .pipe(outputStream);

  // need to use this stream to ensure output file is complete and closed
  if (callback) {
    outputStream.on('finish', function () {
      callback(null, {
        boundary_stream: boundaryStream.stats,
        tag_filter: tagFilterStream.stats
      });
    });
  }

};