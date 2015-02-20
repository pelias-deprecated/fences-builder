var should = require('should');
var EventEmitter = require('events').EventEmitter;

// this is used to stub out required dependencies
var proxyquire = require('proxyquire');
proxyquire.noPreserveCache();

var child = new EventEmitter();
var child_process_stub = {
  fork: function () {
    return child;
  }
};

var PolygonExtractor = proxyquire('./../src/PolygonExtractor', { child_process: child_process_stub });

describe('PolygonExtractor', function () {

  describe('#_areaHandler', function () {
    var _options = { foo: 'bar' };
    var _inst = new PolygonExtractor(_options);
    var _stream = {
      write: function (data) {
        should.exist(data);
      }
    };

    it('should split output into files by admin_level', function (done) {
      _inst._getLevelStream = function (options, streams, level) {
        options.should.equal(_options);
        streams.should.eql({});
        level.should.equal('8');
        done();
        return _stream;
      };

      // emitting this event will trigger _areaHandler
      child.emit('message', { type: 'area', data: { properties: { admin_level: '8' } } });
    });

    it('should direct invalid admin_level areas into "other"', function (done) {
      _inst._getLevelStream = function (options, streams, level) {
        options.should.equal(_options);
        streams.should.eql({});
        level.should.equal('other');

        done();
        return _stream;
      };

      // emitting this event will trigger _areaHandler
      child.emit('message', { type: 'area', data: { properties: { admin_level: 'some/invalid/value' } } });
    });
  });


});