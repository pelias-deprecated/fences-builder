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
    this._index.relations[tagUtil.buildIndexId((relation))] = {
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
    this._index.ways[tagUtil.buildIndexId(way)] = {
      id: way.id,
      name: tagUtil.findNameTag(way),
      properties: way.tags()
    };
  }
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

  var obj = {
    type: 'Feature',
    properties: area.tags(),
    name: tagUtil.findNameTag(area)
  };

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
    this._handleError({ message: err.message, data: obj });
    return;
  }

  this._index.areas.push(tagUtil.buildIndexId(area));

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
  var wayKeys = Object.keys(this._index.ways);
  var relationKeys = Object.keys(this._index.relations);

  //console.log('ways: ', wayKeys.length);
  //console.log('relations: ', relationKeys.length);
  //console.log('areas: ', this._index.areas.length, _.uniq(this._index.areas).length);

  // for every relation not found in areas, assume there was an error
  _.difference(relationKeys, this._index.areas).forEach(function (relationKey) {
    var relation = this._index.relations[relationKey];

    // if no members found, not good
    if (!relation.members || relation.members.length === 0) {
      this._handleError({message: 'Relation has no members', data: relation});
      return;
    }

    // attempt to see which way members are missing (if any)
    var missingWays = 0;
    relation.members.forEach(function (member) {
      if ( member.type === 'w' && !(member.ref in wayKeys) ) {
        member.missing = true;
        missingWays++;
      }
    });

    if (missingWays > 0) {
      relation.missingWayCount = missingWays;
      this._handleError({message: 'Relation missing way members', data: relation});
      return;
    }

    this._handleError({message: 'Problematic relation', data: relation});

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
    relations: {},
    ways: {},
    areas: []
  };
};

module.exports = OSMAreaBuilder;