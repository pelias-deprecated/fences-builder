var fs = require('fs');
var util = require('util');
var path = require('path');
var fork = require('child_process').fork;
var geojson_stream = require('geojson-stream');
var JSONStream = require('JSONStream');

/**
 * PolygonExtract class
 *
 * @param {string} inputFile path to input file
 * @param {string} outputDir path to output file, currently GEOJSON, so provide correct extension
 */
function PolygonExtractor(inputFile, outputDir) {
  this._adminLevelReg = new RegExp(/^\d+$/);

  this._options = {
    inputFile: inputFile,
    outputDir: outputDir
  };
  this._streams = {};

  this._handlers = {
    area: this._areaHandler.bind(this),
    error: this._errorHandler.bind(this),
    done: this._doneHandler.bind(this)
  };


  this._child = fork(__dirname + '/childProcess.js');

  // handle events coming from child process
  this._child.on('message', function (payload) {
    if (this._handlers[payload.type]) {
      this._handlers[payload.type](payload.data);
    }
  }.bind(this));
}

/**
 * Process osm file and generate all found polygons containing administrative boundaries.
 * Write polygons to GEOJSON format (other formats coming soon).
 *
 * @param callback function(err, results): called with statistics in results parameter
 */
PolygonExtractor.prototype.start = function (callback) {
  this._callback = callback;

  this._child.send({
    type:'start',
    data: {
      inputFile: this._options.inputFile
    }
  });
};

/**
 * Convert area objects to geojson and stream to level files
 *
 * @param area object
 * @private
 */
PolygonExtractor.prototype._areaHandler = function (area) {
  var admin_level = this._cleanAdminLevel(area.properties.admin_level);
  this._getLevelStream(this._options, this._streams, admin_level).write(area);
};

/**
 * Prepares admin_level value to be used as part of the output file name.
 * If admin_level is not numeric, return "other"
 *
 * @param admin_level string
 * @returns string
 * @private
 */
PolygonExtractor.prototype._cleanAdminLevel = function (admin_level) {
  if (this._adminLevelReg.test(admin_level)) {
    return admin_level;
  }
  return 'other';
};

/**
 * Stream errors to json file
 *
 * @param err object
 * @private
 */
PolygonExtractor.prototype._errorHandler = function (err) {
  this._getErrorStream(this._options, this._streams).write(err);
};

/**
 * End open streams, kill child process, invoke callback
 *
 * @param results
 * @private
 */
PolygonExtractor.prototype._doneHandler = function (results) {
  // it's ok to kill the child process now
  setImmediate(this._child.kill.bind(this._child));

  this._endStreams(this._streams);

  // only register the finish handler if client is waiting to hear back
  if (this._callback) {
    setImmediate(this._callback.bind(null, null, results));
  }
};

/**
 * End all open output streams
 *
 * @param streams
 * @private
 */
PolygonExtractor.prototype._endStreams = function (streams) {
  for (var s in streams) {
    if (streams.hasOwnProperty(s)) {
      streams[s].input.end();
    }
  }
};

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
PolygonExtractor.prototype._getLevelStream = function (options, streams, level) {
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
};

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
PolygonExtractor.prototype._getErrorStream = function (options, streams) {
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
};

module.exports = PolygonExtractor;

