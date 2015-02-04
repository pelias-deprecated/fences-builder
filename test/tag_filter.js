var should = require('should');
var through = require('through2');

var streamFactory = require('./../src/tag_filter');

describe('tag_filter', function () {

  describe('interface', function () {
    it('should be a stream factory', function (done) {
      streamFactory.should.be.an.type('function');
      done();
    });

    it('should have Transform stream interface', function (done) {
      var s = streamFactory({});
      s.should.be.type('object');
      s.should.have.ownProperty('_transform').type('function');
      done();
    });
  });

  describe('filtering', function () {
    it('should pass through objects with matching tags', function (done) {
      // input
      var inputTags = { boundary: { administrative: true } };
      var inputBoundary = {
        feature: 'multipolygon',
        geometry: [[[1, 2]]],
        properties: {
          boundary: 'administrative',
          admin_level: '8'
        }
      };

      // expected output
      var expectedStats = { matched: 1, discarded: 0 };

      var objCount = 0;
      var stream = streamFactory(inputTags);
      stream
        .pipe(through.obj(function (obj, enc, next) {
          obj.should.be.equal(inputBoundary);
          objCount++;
          next();
        }));

      stream.write(inputBoundary);
      stream.end();

      stream.on('end', function () {
        stream.stats.should.be.eql(expectedStats);
        objCount.should.equal(expectedStats.matched);
        done();
      });
    });

    it('should discard objects not matching tags', function (done) {
      // input
      var inputTags = { boundary: { administrative: true } };
      var inputBoundary = {
        feature: 'multipolygon',
        geometry: [[[1, 2]]],
        properties: {
          boundary: 'unknown',
          admin_level: '8'
        }
      };

      // expected output
      var expectedStats = { matched: 0, discarded: 1 };

      var stream = streamFactory(inputTags);
      stream.pipe(through.obj(function (obj) {
          should.not.exist(obj);
          done(new Error('Object should have been discarded', obj));
        }));
      stream.write(inputBoundary);

      stream.stats.should.be.eql(expectedStats);
      done();
    });
  });
});