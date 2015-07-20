var util = require('util');
var osmium = require('osmium');
var EventEmitter = require('events').EventEmitter;
var wellknown = require('wellknown');
var microtime = require('microtime');
var _ = require('lodash');
var tagUtil = require('./tagUtil');


/**
 * OSMAreaBuilder is a Readable stream that emits Area (multipolygon) objects
 * found in OpenStreetMap input file. It is essentially a wrapper for osmium.
 *
 * @param inputFilePath string
 * @param inputFileType string
 * @param callbacks object associative array of callback functions
 *                         Must provide area and error, filter is optional
 * @constructor
 */
function OSMAreaBuilder(inputFilePath, inputFileType, callbacks) {
  this._callbacks = callbacks;

  if (!(this._callbacks.hasOwnProperty('area') && this._callbacks.hasOwnProperty('error'))) {
    throw new Error('OSMAreaBuilder failed to instantiate without area and error callback functions');
  }

  inputFileType = inputFileType || 'pbf';
  var fileIn = new osmium.File(inputFilePath, inputFileType);

  // create reader and handlers
  this._location_handler = new osmium.LocationHandler();
  this._reader = new osmium.Reader(fileIn);
  this._handler = new osmium.Handler();

  // if this isn't specified, osmium will throw exceptions when it encounters errors
  this._location_handler.ignoreErrors();

  // multipolygon handler
  var mpReader = new osmium.Reader(fileIn, { node: false, way: true, relation: true });
  this._mp = new osmium.MultipolygonCollector();
  this._mp.read_relations(mpReader);
  mpReader.close();

  // register event handlers
  this._handler.on('relation', this._handleRelation.bind(this));
  this._handler.on('way',      this._handleWay.bind(this));
  this._handler.on('area',     this._handleArea.bind(this));
  this._handler.on('done',     this._handleDone.bind(this));
}

util.inherits(OSMAreaBuilder, EventEmitter); // inherit the prototype methods

/**
 * Begin processing the input file and emitting events.
 *
 * NOTE: this blocks the event loop so any event handlers registered
 * after calling this function will not be fired.
 */
OSMAreaBuilder.prototype.start = function start() {
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
 * Store relation data in index
 *
 * @param relation
 * @private
 */
OSMAreaBuilder.prototype._handleRelation = function handleRelation(relation) {
  if (tagUtil.checkAdminTags(relation)) {
    this._index.osmObjs[tagUtil.buildIndexId('relation', relation.id)] = {
      id: relation.id,
      name: relation.tags('name'),
      properties: relation.tags(),
      members: relation.members()
    };
  }
};

/**
 * Store way id in index
 *
 * @param way
 * @private
 */
OSMAreaBuilder.prototype._handleWay = function handleWay(way) {
  if (tagUtil.checkAdminTags(way)) {
    this._index.osmObjs[tagUtil.buildIndexId('way', way.id)] = {
      id: way.id,
      name: tagUtil.findNameTag(way) || undefined,
      properties: way.tags()
    };
  }
};

/**
 * Construct a fences object out of the osmium area
 *
 * @param area
 * @returns {object} { id: {number}, osm_type: "relation"|"way, type: "Feature", properties: {object} }
 */
OSMAreaBuilder.prototype._buildOSMObjectFromArea = function buildOSMObjectFromArea(area) {
  var obj = {};

  /**
   * NOTE: osmium will multiply osm original ids by 2 and add 1 if it's a relation.
   * This is done to generate a unique internal id for every area. Here we need to reconstruct the
   * original id and type.
   */

  obj.id = Math.floor(area.id / 2);
  obj.osm_type = (area.id % 2 === 0) ? 'way' : 'relation';

  obj.type = 'Feature';
  obj.name = tagUtil.findNameTag(area) || undefined;

  obj.properties = area.tags();

  return obj;
};

/**
 * Process osmium area object and emit area event
 *
 * @param area
 * @emit area, error
 * @private
 */
OSMAreaBuilder.prototype._handleArea = function handleArea(area) {
  var start = microtime.now();

  // get time spent in osmium preprocessing (before first area is received)
  if (this._stats.areaCount === 0 && this._stats.errorCount === 0) {
    this._stats.timeInPreprocess = start - this._startTime;
  }

  this._stats.areaCount++;

  var obj = this._buildOSMObjectFromArea(area);

  // check if filter was provided and if so call it
  if (this._callbacks.filter && !this._callbacks.filter(obj)) {
    return;
  }

  if (!obj.name) {
    this._handleError({message: 'Area is missing a name tag', data: obj});
    return;
  }

  // log every once in a while
  if (this._stats.areaCount % 100000 === 0) {
    console.log(this._stats.areaCount);
  }

  try {
    // TODO: figure out an alternative to this because it's slow
    obj.geometry = wellknown.parse(area.wkt());
  }
  catch (err) {
    this._handleError({ message: '[OSMIUM]: ' + err.message, data: obj });
    return;
  }

  this._index.areas.push(tagUtil.buildIndexId(obj.osm_type, obj.id));

  var beforeCB = microtime.now();
  this._stats.timeInArea += beforeCB - start;

  this._callbacks.area(obj);

  this._stats.timeInAreaHandler += microtime.now() - beforeCB;
};

/**
 * Report error to client callback
 *
 * @param {object} err
 * @private
 */
OSMAreaBuilder.prototype._handleError = function handleError(err) {
  this._stats.errorCount++;

  // check if filter was provided and if so call it
  if (this._callbacks.filter && !this._callbacks.filter(err.data)) {
    return;
  }

  this._callbacks.error(err);
};

/**
 * Find all errors and emit them at the end of the run
 * Expects this._index to contain ways, relations, areas
 *
 * @private
 */
OSMAreaBuilder.prototype._handleErrors = function handleErrors() {
  var osmObjKeys = Object.keys(this._index.osmObjs);

  // for every relation not found in areas, assume there was an error
  _.difference(osmObjKeys, this._index.areas).forEach(function (osmObjKey) {
    this._handleError({message: 'Failed to load', data: this._index.osmObjs[osmObjKey]});
  }.bind(this));
};

/**
 * Emit done event
 *
 * @private
 */
OSMAreaBuilder.prototype._handleDone = function handleDone() {

  this._handleErrors();

  this.emit('done', this._stats);
};

/**
 * Set internal stat counts to 0
 *
 * @private
 */
OSMAreaBuilder.prototype._resetStats = function resetStats() {
  this._stats = {
    errorCount: 0,
    areaCount: 0,
    timeInArea: 0,
    timeInAreaHandler: 0,
    timeInPreprocess: 0
  };

  this._index = {
    osmObjs: {},
    areas: []
  };
};

module.exports = OSMAreaBuilder;