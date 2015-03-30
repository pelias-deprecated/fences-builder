var fs = require('fs');
var util = require('util');
var should = require('should');

var PolygonExtractor = require('./../');

var expectedOutputDir = './test/data/expected_output/';
var inputFileDir = './test/data/input/';
var outputFileDir = './test/data/';
var baseFileName = 'philadelphia_pennsylvania.osm.pbf';

var inputFilePath = inputFileDir + baseFileName;
var outputFilePath = '%s' + baseFileName + '-level-%s.geojson';
var errorFilePath =  '%s' + baseFileName  + '.err.json';

describe('fences-builder', function () {

  var _error = null;
  var _results = null;
  var _extractor = null;

  before(function(done) {
    this.timeout(0);

    _extractor = new PolygonExtractor(inputFilePath, outputFileDir);
    _extractor.start(function (err, results) {
      _error = err;
      _results  = results;
      setTimeout(done, 30); // timeout ensures the error file has been written and closed
    });
  });

  it('should return without error', function () {
    should.not.exist(_error);
  });

  it('should return stats', function () {
    var expAreaMatched = 205;
    var expAreaTotal = 67040;
    var expErrors = 66;

    _results.areaMatched.should.be.eql(expAreaMatched);
    _results.areaTotal.should.be.eql(expAreaTotal);
    _results.errorMatched.should.be.eql(expErrors);
    _results.errorTotal.should.be.eql(expErrors);
    _results.osmiumResults.areaCount.should.be.eql(expAreaTotal);
    _results.osmiumResults.errorCount.should.be.eql(expErrors);
    _results.osmiumResults.should.have.property('timeInArea');
    _results.osmiumResults.should.have.property('timeInAreaHandler');
    _results.osmiumResults.should.have.property('timeInPreprocess');
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
