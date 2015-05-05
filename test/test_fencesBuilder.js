var fs = require('fs');
var util = require('util');

var PolygonExtractor = require('./../');

var expectedOutputDir = './test/data/expected_output/';
var inputFileDir = './test/data/input/';
var outputFileDir = './test/data/';
var baseFileName = 'philadelphia_pennsylvania.osm.pbf';

var inputFilePath = inputFileDir + baseFileName;
var outputFilePath = '%s/admin_level_%s.geojson';
var errorFilePath =  '%s/errors.json';

module.exports.tests = {};

module.exports.tests.execute = function(test) {

  var _error = null;
  var _results = null;
  var _extractor = null;
  var _initialized = false;

  function before(done) {
    if (_initialized) {
      return process.nextTick(done);
    }

    _extractor = new PolygonExtractor(inputFilePath, outputFileDir);
    _extractor.start(function (err, results) {
      _error = err;
      _results  = results;
      setTimeout(function () {
          _initialized = true;
          done();
        },
        50); // timeout ensures the error file has been written and closed
    });
  }

  test('should return without error', function (t) {
    before(function () {
      t.assert(!_error, 'no unexpected errors');
      t.end();
    });
  });

  test('should return stats', function (t) {
    before(function () {
      var expAreaMatched = 206;
      var expAreaTotal = 67040;
      var expErrors = 65;

      t.deepEqual(_results.areaMatched, expAreaMatched, 'validate extracted area count');
      t.deepEqual(_results.areaTotal, expAreaTotal, 'validate total count');
      t.deepEqual(_results.errorMatched, expErrors, 'validate matched error count');
      t.deepEqual(_results.errorTotal, expErrors, 'valiadate total error count');
      t.deepEqual(_results.osmiumResults.areaCount, expAreaTotal, 'validate osmium area count');
      t.deepEqual(_results.osmiumResults.errorCount, expErrors, 'validate osmium error count');
      t.assert(_results.osmiumResults.hasOwnProperty('timeInArea'), 'time in area processing recorded');
      t.assert(_results.osmiumResults.hasOwnProperty('timeInAreaHandler'), 'time in area handler recorded');
      t.assert(_results.osmiumResults.hasOwnProperty('timeInPreprocess'), 'time in child process recorded');
      t.end();
    });
  });

  test('should produce geojson files per level', function (t) {

    function sortFeatures(array) {
      return array.sort(function (a, b) {
        if (a.name < b.name) { return -1; }
        if (a.name > b.name) { return 1; }

        function sum(previousValue, currentValue) {
          return previousValue + currentValue;
        }
        var sumA = a.geometry.coordinates.reduce(sum);
        var sumB = b.geometry.coordinates.reduce(sum);

        if (sumA < sumB) { return -1; }
        if (sumA > sumB) { return 1; }

        if (Object.keys(a.properties).length > Object.keys(b.properties).length) { return -1; }
        if (Object.keys(a.properties).length < Object.keys(b.properties).length) { return 1; }

        console.log('sorting tie, could result in unexpected error', a.name, b.name);
        return 0;
      });
    }

    before(function () {
      [6, 7, 8].forEach(function (level) {
        var expectedFile = util.format(outputFilePath, expectedOutputDir, level);
        var actualFile = util.format(outputFilePath, outputFileDir, level);

        var expected = JSON.parse(fs.readFileSync(expectedFile));
        var actual = JSON.parse(fs.readFileSync(actualFile));

        expected.features = sortFeatures(expected.features);
        actual.features = sortFeatures(actual.features);

        t.equal(expected.features.length, actual.features.length, 'result count should match expected');

        t.deepEqual(actual.features, expected.features, 'compare results to expected');

        // delete temp file
        fs.unlinkSync(actualFile);
      });
      t.end();
    });
  });

  test('should produce json error file', function (t) {
    before(function () {
      var expectedFile = util.format(errorFilePath, expectedOutputDir);
      var actualFile = util.format(errorFilePath, outputFileDir);

      var expected = JSON.parse(fs.readFileSync(expectedFile));
      var actual = JSON.parse(fs.readFileSync(actualFile));

      t.deepEqual(actual, expected, 'errors should match expected');

      // delete temp file
      fs.unlinkSync(actualFile);

      t.end();
    });
  });
};


module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('fences-builder ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};
