var fs = require('fs');
var util = require('util');
var should = require('should');
var polygons = require('./../');

var expectedOutputDir = './test/data/expected_output/';
var inputFileDir = './test/data/input/';
var outputFileDir = './test/data/';
var baseFileName = 'philadelphia_pennsylvania.osm.pbf';

var inputFilePath = inputFileDir + baseFileName;
var outputFilePath = '%s' + baseFileName + '-level-%s.geojson';
var errorFilePath =  '%s' + baseFileName  + '.err.json';

describe('openstreetmap-polygons', function () {

  var _error = null;
  var _results = null;

  before(function(done) {
    this.timeout(0);
    var options = {
      inputFile: inputFilePath,
      outputDir: outputFileDir
    };

    polygons.extractPolygons(options, function (err, results) {
      _error = err;
      _results  = results;
      done();
    });
  });

  it('should return without error', function () {
    should.not.exist(_error);
  });

  it('should return stats', function () {
    var expectedStats = {
      error_total: 1,
      area_total: 67040,
      area_matched: 211,
      error_matched: 1
    };
    _results.should.be.eql(expectedStats);
  });

  it('should produce geojson files per level', function (done) {

    function sortFeatures(array) {
      return array.sort(function (a, b) {
        if (a.name < b.name) { return -1; }
        if (a.name > b.name) { return 1; }
        return 0;
      });
    }

    [6,7,8].forEach(function (level) {
      var expectedFile = util.format(outputFilePath, expectedOutputDir, level);
      var actualFile = util.format(outputFilePath, outputFileDir, level);

      var expected = JSON.parse(fs.readFileSync(expectedFile));
      var actual = JSON.parse(fs.readFileSync(actualFile));

      expected.features = sortFeatures(expected.features);
      actual.features = sortFeatures(actual.features);

      actual.should.be.eql(expected);

      // delete temp file
      fs.unlinkSync(actualFile);
    });

    done();
  });

  it('should produce json error file', function (done) {
    var expectedFile = util.format(errorFilePath, expectedOutputDir);
    var actualFile = util.format(errorFilePath, outputFileDir);

    var expected = JSON.parse(fs.readFileSync(expectedFile));
    var actual = JSON.parse(fs.readFileSync(actualFile));

    actual.should.be.eql(expected);

    // delete temp file
    fs.unlinkSync(actualFile);

    done();
  });
});
