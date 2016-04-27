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
  var stats = {
    matched: 0,
    errors: 0
  };

  var handlers = {
    filter: function filterCallback(area) {
      return !!(area.properties.boundary == 'administrative' || area.properties.boundary == 'historic' || area.properties.boundary == 'ceremonial');
    },
    area: function areaCallback(area) {
      stats.matched++;
      process.send({type: 'area', data: area});
    },
    error: function errorCallback(err) {
      stats.errors++;
      process.send({type: 'error', data: err});
    }
  };

  var areaBuilder = new OSMAreaBuilder(inputFile, path.extname(inputFile), handlers);

  areaBuilder.on('done', function (results) {
    process.send({
      type: 'done',
      data: {
        osmiumResults: results,
        areaTotal: results.areaCount,
        errorTotal: results.errorCount,
        areaMatched: stats.matched,
        errorMatched: stats.errors
      }
    });
  });

  areaBuilder.start();

  // process needs to be kill explicitly, otherwise it just hangs around
  process.exit();
}