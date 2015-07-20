var util = require('util');
var proxyquire = require('proxyquire');
var pkg = require('../package.json');
var moment = require('moment');


module.exports.tests = {};

module.exports.tests.execute = function(test) {

  test('should build geocoding info', function (t) {

    var outputDir = 'foo/dir///';
    var level = 10;

    var destStream = {
      foo: 'bar'
    };

    var fsMock = {
      ensureDirSync: function (dir) {
        t.equal(outputDir, dir, 'ensure output dir exists');
      },
      createWriteStream: function (file) {
        t.equal(util.format('foo/dir/admin_level_%s.geojson', level), file, 'verify output filename');
        return destStream;
      }
    };

    var streamMock = {
      pipe: function (dest) {
        t.equal(destStream, dest, 'piped to output stream');
        return this;
      }
    };

    var geocodeJsonMock = {
      stringify: function (geocodingInfo) {
        t.equal(moment().format('YYYY-MM-DD'), geocodingInfo.creation_date, 'geocoding block has creation_date');
        t.equal(pkg.author, geocodingInfo.generator.author, 'geocoding block has generator.author');
        t.equal(pkg.name, geocodingInfo.generator.package, 'geocoding block has generator.package');
        t.equal(pkg.version, geocodingInfo.generator.version, 'geocoding block has generator.version');
        t.equal('ODbL (see http://www.openstreetmap.org/copyright)', geocodingInfo.license,
          'geocoding block has license');

        return streamMock;
      }
    };

    var factory = proxyquire('./../src/streamFactory', {
      'fs-extra': fsMock,
      'geocodejson-stream': geocodeJsonMock
    });

    var res = factory.getLevelStream(outputDir, level);
    t.equal(streamMock, res, 'stream returned successfully');
    t.equal(streamMock, factory.getLevelStream(outputDir, level), 'subsequent calls return originally created stream');
    t.end();
  });
};


module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('streamFactory ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};
