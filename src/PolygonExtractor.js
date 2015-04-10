var fork = require('child_process').fork;
var streamFactory = require('./streamFactory');

/**
 * PolygonExtractor class is responsible for forking the child process
 * that parses the input file. PolygonExtractor will receive data events
 * the child process emits, and direct the data to the appropriate output streams.
 *
 * @param {string} inputFile path to input file
 * @param {string} outputDir path to output file, currently GEOJSON, so provide correct extension
 */
function PolygonExtractor(inputFile, outputDir) {
  this._options = {
    inputFile: inputFile,
    outputDir: outputDir
  };

  this._child = fork(__dirname + '/childProcess.js', [], { silent: false });

  this._child.on('exit', function (code) {
    if (code !== 0) {
      console.error('Child process exited with error ', code);
      process.exit(code);
    }
  }.bind(this));
}

/**
 * Process osm file and generate all found polygons containing administrative boundaries.
 * Write polygons to GEOJSON format (other formats coming soon).
 *
 * @param {function} [callback] (err, results): called with statistics in results parameter
 */
PolygonExtractor.prototype.start = function (callback) {

  // handle data events coming from child process
  this._child.on('message', function (payload) {
    switch (payload.type) {
      case 'area':
        this.areaBuilder(payload.data);
        break;
      case 'error':
        this.errorHandler(payload.data);
        break;
      case 'done':
        this.doneHandler(payload.data);
        // only register the finish handler if client is waiting to hear back
        if (callback && typeof callback === 'function') {
          setImmediate(callback.bind(null, null, payload.data));
        }
        break;
    }
  }.bind(this));


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
 * @param {object} area
 * @private
 */
PolygonExtractor.prototype.areaBuilder = function (area) {
  var admin_level = this.cleanAdminLevel(area.properties.admin_level);
  streamFactory.getLevelStream(this._options.outputDir, admin_level).write(area);
};

/**
 * Stream errors to json file
 *
 * @param {object} err
 * @private
 */
PolygonExtractor.prototype.errorHandler = function (err) {
  streamFactory.getErrorStream(this._options.outputDir).write(err);
};

/**
 * End open streams, kill child process, invoke callback
 *
 * @param {object} results
 * @private
 */
PolygonExtractor.prototype.doneHandler = function (/*results*/) {
  // close all created streams
  streamFactory.endStreams();
};


/**
 * Prepares adminLevel value to be used as part of the output file name.
 * If adminLevel is not numeric, return "other"
 *
 * @param {string} adminLevel
 * @returns string
 * @private
 */
PolygonExtractor.prototype.cleanAdminLevel = function (adminLevel) {
  var adminLevelReg = new RegExp(/^\d+$/);

  if (adminLevelReg.test(adminLevel)) {
    return adminLevel;
  }
  return 'other';
};

module.exports = PolygonExtractor;

