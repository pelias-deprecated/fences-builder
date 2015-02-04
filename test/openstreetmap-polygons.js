var fs = require('fs');
var should = require('should');
var osm_boundaries = require('./../');


var outputFilePath = './test/data/test_output.geojson';

describe('openstreetmap-boundaries', function () {

  describe('integration', function () {

    it('should process an input file and produce expected results', function (done) {
      this.timeout(0);

      var options = {
        inputFile: 'https://s3.amazonaws.com/metro-extracts.mapzen.com/asti_italy.osm.pbf',
        inputType: 'pbf',
        outputFile: outputFilePath,
        filterTags: {
          boundary: {administrative: true}
        }
      };

      osm_boundaries(options, function (err, results) {
        should.not.exist(err, 'Callback returns with no error');

        var expectedStats = {
          boundary_stream: {
            errorCount: 29,
            areaCount: 3109
          },
          tag_filter: {
            matched: 11,
            discarded: 3098
          }
        };

        results.should.be.eql(expectedStats, 'Validate stream stats');

        var expected = JSON.parse(fs.readFileSync('./test/data/test_expected_output.geojson'));
        var actual = JSON.parse(fs.readFileSync(outputFilePath));
        actual.should.be.eql(expected, 'Validate GEOJSON output file against expected');

        // delete temp file
        fs.unlinkSync(outputFilePath);

        done();
      });
    });
  });
});
