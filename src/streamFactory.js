var fs = require('fs-extra');
var util = require('util');
var path = require('path');
var geojson_stream = require('geojson-stream');
var JSONStream = require('JSONStream');

/**
 * Map of created streams.
 * There will be a stream per level and an error stream:
 *
 * {
 *   errors: {input: <input stream>, output: <output stream>},
 *   '8': {input: <input stream>, output: <output stream>},
 *   other: {input: <input stream>, output: <output stream>}
 * }
 *
 * @type {{}}
 */
var streams = {};

/**
 * Create or return existing stream for the given admin level
 *
 * @param {string} outputDir full path to existing output directory
 * @param {string} level admin level value
 * @returns Streams.Writable
 */
module.exports.getLevelStream = function getLevelStream(outputDir, level) {
  if (streams[level]) {
    return streams[level].input;
  }

  fs.ensureDirSync(outputDir);

  var outputFilePath = path.join(outputDir,
    util.format('admin_level_%s.geojson', level));

  var geojsonStream = geojson_stream.stringify();
  var outputStream = fs.createWriteStream(outputFilePath);

  // setup the output streams
  geojsonStream.pipe(outputStream);

  streams[level] = { input: geojsonStream, output: outputStream };
  return streams[level].input;
};

/**
 * Create or return existing error output stream
 *
 * @param {string} outputDir full path to existing output directory
 * @returns Streams.Writable
 */
module.exports.getErrorStream = function getErrorStream(outputDir) {
  if (streams.errors) {
    return streams.errors.input;
  }

  fs.ensureDirSync(outputDir);

  var errorFilePath = path.join(outputDir, 'errors.json');

  var jsonStream = JSONStream.stringify();
  var outputStream = fs.createWriteStream(errorFilePath);

  // setup the output streams
  jsonStream.pipe(outputStream);

  streams.errors = { input: jsonStream, output: outputStream };
  return streams.errors.input;
};


/**
 * End all open output streams
 */
module.exports.endStreams = function endStreams() {
  for (var s in streams) {
    if (streams.hasOwnProperty(s)) {
      streams[s].input.end();
    }
  }
};
