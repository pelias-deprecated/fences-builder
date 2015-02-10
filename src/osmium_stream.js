var osmium = require('osmium');
var OsmiumStream = require('osmium-stream');


/**
 * OSMAreaStream is a Readable stream that emits Area (multipolygon) objects
 * found in OpenStreetMap input file.
 *
 * NOTE: the stream blocks on first call to _read to allow osmium
 * to fully process the input file. area objects are emitted
 * as soon as they become available from osmium.
 *
 * @param inputFilePath string
 * @param inputFileType string
 * @constructor
 */
module.exports = function (inputFilePath, inputFileType) {

  inputFileType = inputFileType || 'pbf';

  var fileIn = new osmium.File(inputFilePath, inputFileType);
  var stream = new OsmiumStream( new osmium.Reader( fileIn ) );

  return stream;
};