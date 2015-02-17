var path = require('path');
var OSMAreaBuilder = require('./OSMAreaBuilder');

/**
 * Child process containing Osmium file parser logic.
 *
 * NOTE: Osmium must be handled within its own process because
 * it doesn't respect node's asynchronous nature and does
 * all the processing a single tick. Running it in a child
 * process and sending callbacks to parent as messages
 * allows us to handle those messages asynchronously.
 */

process.on('message', function (payload) {
  if (payload.type === 'start') {
    extractPolygons(payload.data.inputFile);
  }
});

/**
 * Run osmium file parsing and extract only administrative boundaries.
 * Emits area, error, and done messages to the parent process.
 *
 * @param inputFile string
 */
function extractPolygons(inputFile) {
  var _stats = {
    matched: 0,
    errors: 0
  };

  var handlers = {
    filter: function _filterCallback(area) {
      return !!(area.properties.boundary === 'administrative' && area.properties.admin_level);
    },
    area: function _areaCallback(area) {
      _stats.matched++;
      process.send({type: 'area', data: area});
    },
    error: function _errorCallback(err) {
      var area = err.data;
      if (area.properties.boundary === 'administrative') {
        _stats.errors++;
        process.send({type: 'error', data: err});
      }
    }
  };

  var boundaryStream = new OSMAreaBuilder(inputFile, path.extname(inputFile), handlers);

  boundaryStream.on('done', function (results) {
    process.send({
      type: 'done',
      data: {
        area_total: results.areaCount,
        error_total: results.errorCount,
        area_matched: _stats.matched,
        error_matched: _stats.errors
      }
    });
  });

  boundaryStream.start();
}