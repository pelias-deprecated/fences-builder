var async = require('async');
var relation_index = require('./src/relation_index');
var node_lookup = require('./src/node_lookup');
var polygon_lookup = require('./src/polygon_lookup');

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

  async.waterfall(
    [
      relation_index.bind(null, options),
      node_lookup.bind(null, options),
      polygon_lookup
    ],
    function (err) {
      callback(err, 'OK');
    }
  );
};
