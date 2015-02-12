var util = require('util');
var osmium = require('osmium');
var EventEmitter = require('events').EventEmitter;
var wellknown = require('wellknown');
var microtime = require('microtime');
var logger = require('./util/logger');


/**
 * OSMAreaBuilder is a Readable stream that emits Area (multipolygon) objects
 * found in OpenStreetMap input file.
 *
 * @param inputFilePath string
 * @param inputFileType string
 * @param areaHandler function(area) will be called for each valid area object
 * @param errorHandler function(err) will be called when invalid areas are encountered
 * @constructor
 */
function OSMAreaBuilder(inputFilePath, inputFileType, areaHandler, errorHandler) {

  this._areaHandler = areaHandler;
  this._errorHandler = errorHandler;


  inputFileType = inputFileType || 'pbf';
  var fileIn = new osmium.File(inputFilePath, inputFileType);

  // create reader and handlers
  this._location_handler = new osmium.LocationHandler();
  this._reader = new osmium.Reader(fileIn);
  this._handler = new osmium.Handler();

  // multipolygon handler
  var mpReader = new osmium.Reader(fileIn);
  this._mp = new osmium.MultipolygonCollector();
  this._mp.read_relations(mpReader);
  mpReader.close();

  // register event handlers
  this._handler.on('done', this._emitDone.bind(this));
  this._handler.on('area', this._emitArea.bind(this));
}

util.inherits(OSMAreaBuilder, EventEmitter); // inherit the prototype methods

/**
 * Begin processing the input file and emitting events.
 *
 * NOTE: this blocks the event loop so any event handlers registered
 * after calling this function will not be fired.
 */
OSMAreaBuilder.prototype.start = function() {
  this._resetStats();

  this._startTime = microtime.now();

  // invoke the engine with all the specified handlers
  osmium.apply(
    this._reader,
    this._location_handler,
    this._handler,
    this._mp.handler(this._handler));

  this._reader.close();
};


/**
 * Set internal stat counts to 0
 *
 * @private
 */
OSMAreaBuilder.prototype._resetStats = function () {
  this._stats = {
    errorCount: 0,
    areaCount: 0,
    timeInArea: 0,
    timeInAreaHandler: 0,
    timeInPreprocess: 0
  };
};

/**
 * Process osmium area object and emit area event
 *
 * @param area
 * @emit area, error
 * @private
 */
OSMAreaBuilder.prototype._emitArea = function (area) {
  var start = microtime.now();

  // get time spent in osmium preprocessing (before first area is received)
  if (this._stats.areaCount === 0 && this._stats.errorCount === 0) {
    this._stats.timeInPreprocess = start - this._startTime;
  }

  try {
    var obj = {
      type: 'Feature',
      geometry: wellknown.parse(area.wkt()),
      properties: area.tags()
    };
    obj.name = obj.properties.name || obj.properties.type;

    this._stats.areaCount++;

    // log every once in a while
    if (this._stats.areaCount % 100000 === 0) {
      logger.info(this._stats.areaCount);
    }

    var beforeCB = microtime.now();
    this._stats.timeInArea += beforeCB - start;

    this._areaHandler(obj);

    this._stats.timeInAreaHandler += microtime.now() - beforeCB;
  }
  catch (err) {
    this._stats.errorCount++;

    area.name = area.tags().name;
    area.properties = area.tags();

    this._errorHandler({ message: err.message, data: area });
  }
};

/**
 * Emit done event
 *
 * @private
 */
OSMAreaBuilder.prototype._emitDone = function () {
  this.emit('done');
};


module.exports = OSMAreaBuilder;