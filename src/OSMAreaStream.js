var util = require('util');
var Readable = require('stream').Readable;
var osmium = require('osmium');
var wellknown = require('wellknown');

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
function OSMAreaStream(inputFilePath, inputFileType) {

  this.stats = {
    errorCount: 0,
    areaCount: 0
  };

  Readable.call(this, { objectMode: true });

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

  this._handler.on('done', function () {
    this.push(null);
  }.bind(this));

  // emit all area objects
  this._handler.on('area', function (area) {
    try {
      this.push({
        type: 'Feature',
        geometry: wellknown.parse(area.wkt()),
        properties: area.tags()
      });
      this.stats.areaCount++;
    }
    catch (err) {
      //console.log('Error: ', err);
      this.stats.errorCount++;
    }
  }.bind(this));
}

util.inherits(OSMAreaStream, Readable); // inherit the prototype methods

OSMAreaStream.prototype._read = function() {

  // invoke the engine with all the specified handlers
  osmium.apply(
    this._reader,
    this._location_handler,
    this._handler,
    this._mp.handler(this._handler));

  this._reader.close();
};

module.exports = OSMAreaStream;