var fs = require('fs');
var util = require('util');
var path = require('path');
var fork = require('child_process').fork;
var geojson_stream = require('geojson-stream');
var JSONStream = require('JSONStream');

/**
 * Process osm file and generate all found polygons containing administrative boundaries.
 * Write polygons to GEOJSON format (other formats coming soon).
 *
 * @param options object
 * @param options.inputFile string: path to input file
 * @param options.outputDir: path to output file, currently GEOJSON, so provide correct extension
 * @param callback function(err, results): called with statistics in results parameter
 */
module.exports = function extractPolygons(options, callback) {

  var self = {
    options: options,
    callback: callback,
    streams: {},
    child: fork(__dirname + '/childProcess.js')
  };

  var handlers = {
    area: _areaHandler.bind(self),
    error: _errorHandler.bind(self),
    done: _doneHandler.bind(self)
  };

  // handle events coming from child process
  self.child.on('message', function (payload) {
    if (handlers[payload.type]) {
      handlers[payload.type](payload.data);
    }
  });

  self.child.send({ type:'start', data: { inputFile: options.inputFile } });
};

/**
 * Convert area objects to geojson and stream to level files
 *
 * @param area object
 * @private
 */
function _areaHandler(area) {
  _getLevelStream(this.options, this.streams, area.properties.admin_level).write(area);
}

/**
 * Stream errors to json file
 *
 * @param err object
 * @private
 */
function _errorHandler(err) {
  _getErrorStream(this.options, this.streams).write(err);
}

/**
 * End open streams, kill child process, invoke callback
 *
 * @param results
 * @private
 */
function _doneHandler(results) {
  // it's ok to kill the child process now
  setImmediate(this.child.kill.bind(this.child));

  _endStreams(this.streams);

  // only register the finish handler if client is waiting to hear back
  if (this.callback) {
    setImmediate(this.callback.bind(null, null, results));
  }
}

/**
 * End all open output streams
 *
 * @param streams
 * @private
 */
function _endStreams(streams) {
  for (var s in streams) {
    if (streams.hasOwnProperty(s)) {
      streams[s].input.end();
    }
  }
}

/**
 * Create or return existing stream for the given admin level
 *
 * @param options object: config values
 * @param options.inputFile string: full path to input file
 * @param options.outputDir string: full path to existing output directory
 * @param streams object: associative array of streams, indexed by admin level
 * @param level string: admin level value
 * @returns Streams.Writable
 * @private
 */
function _getLevelStream(options, streams, level) {
  if (streams[level]) {
    return streams[level].input;
  }

  var baseName = path.basename(options.inputFile);
  var outputFilePath = path.join(options.outputDir,
    util.format('%s-level-%s.geojson', baseName, level));

  var geojsonStream = geojson_stream.stringify();
  var outputStream = fs.createWriteStream(outputFilePath);

  // setup the output streams
  geojsonStream.pipe(outputStream);

  streams[level] = { input: geojsonStream, output: outputStream };
  return streams[level].input;
}

/**
 * Create or return existing error output stream
 *
 * @param options object: config values
 * @param options.inputFile string: full path to input file
 * @param options.outputDir string: full path to existing output directory
 * @param streams object: associative array of streams, indexed by admin level
 * @returns Streams.Writable
 * @private
 */
function _getErrorStream(options, streams) {
  if (streams.errors) {
    return streams.errors.input;
  }

  var baseName = path.basename(options.inputFile);
  var errorFilePath = path.join(options.outputDir, baseName + '.err.json');

  var jsonStream = JSONStream.stringify();
  var outputStream = fs.createWriteStream(errorFilePath);

  // setup the output streams
  jsonStream.pipe(outputStream);

  streams.errors = { input: jsonStream, output: outputStream };
  return streams.errors.input;
}