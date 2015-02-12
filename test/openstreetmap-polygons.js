var fs = require('fs');
var should = require('should');
var polygons = require('./../');

var expectedOutputFilePath = './test/data/test_expected_output.geojson';
var expectedErrorFilePath = './test/data/test_expected_errors.geojson';

var inputFilePath = 'https://s3.amazonaws.com/metro-extracts.mapzen.com/asti_italy.osm.pbf';
var outputFileDir = './test/data';
var outputFilePath = outputFileDir + '/asti_italy.osm.pbf.geojson';
var errorFilePath = outputFileDir + '/asti_italy.osm.pbf.err.json';

describe('openstreetmap-polygons', function () {

  it('should produce expected results, no error file', function (done) {
    this.timeout(0);

    var options = {
      inputFile: inputFilePath,
      inputType: 'pbf',
      outputDir: outputFileDir
    };

    polygons.extractPolygons(options, function (err, results) {
      should.not.exist(err, 'Callback returns with no error');

      var expectedStats = {
        boundary_stream: {
          errorCount: 29,
          areaCount: 3109
        },
        filter: {
          matched: 11,
          errors: 1
        }
      };

      results.filter.should.be.eql(expectedStats.filter);
      results.boundary_stream.areaCount.should.be.eql(expectedStats.boundary_stream.areaCount);
      results.boundary_stream.errorCount.should.be.eql(expectedStats.boundary_stream.errorCount);

      var expected = JSON.parse(fs.readFileSync(expectedOutputFilePath));
      var actual = JSON.parse(fs.readFileSync(outputFilePath));
      actual.should.be.eql(expected);

      // delete temp file
      fs.unlinkSync(outputFilePath);

      done();
    });
  });


  it('should produce error file', function (done) {
    this.timeout(0);

    var options = {
      inputFile: inputFilePath,
      inputType: 'pbf',
      outputDir: outputFileDir,
      errorDump: true
    };

    polygons.extractPolygons(options, function () {
      var expected = JSON.parse(fs.readFileSync(expectedErrorFilePath));
      var actual = JSON.parse(fs.readFileSync(errorFilePath));
      actual.should.be.eql(expected);

      // delete temp file
      fs.unlinkSync(outputFilePath);
      fs.unlinkSync(errorFilePath);

      done();
    });
  });
});
