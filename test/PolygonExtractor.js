var should = require('should');
var EventEmitter = require('events').EventEmitter;

// this is used to stub out required dependencies
var proxyquire = require('proxyquire');
proxyquire.noPreserveCache();


describe('PolygonExtractor', function () {

  describe('#_areaHandler', function () {

    var options = {
      inputFile: 'input_file',
      outputDir: 'output_dir'
    };

    var streamFactory = makeStreamFactoryStub(options);
    var childProcess = makeChildProcessStub(options);

    var PolygonExtractor = proxyquire('./../src/PolygonExtractor',
      {
        'child_process': childProcess,
        './streamFactory': streamFactory
      });

    var inst = new PolygonExtractor(options.inputFile, options.outputDir);

    inst.start();

    it('should split output into files by admin_level', function (done) {
      streamFactory.expectedLevel = '8';
      streamFactory.done = done;

      // emitting this event will trigger _areaHandler
      childProcess.child.emit('message', { type: 'area', data: { properties: { admin_level: '8' } } });
    });

    it('should direct invalid admin_level areas into "other"', function (done) {
      streamFactory.expectedLevel = 'other';
      streamFactory.done = done;

      // emitting this event will trigger _areaHandler
      childProcess.child.emit('message', { type: 'area', data: { properties: { admin_level: 'some/invalid/value' } } });
    });
  });
});

function makeChildProcessStub(options) {
  var child = new EventEmitter();

  child.send = function (msg) {
    msg.type.should.equal('start');
    msg.data.inputFile.should.equal(options.inputFile);
  };

  return {
    child: child,
    fork: function () {
      return child;
    }
  };
}

function makeStreamFactoryStub(options) {
  var stream = {
    write: function (data) {
      should.exist(data);
    }
  };

  return {
    expectedLevel: '',
    done: function () {},
    getLevelStream: function (outputDir, level) {
      outputDir.should.eql(options.outputDir);
      level.should.equal(this.expectedLevel);
      this.done();
      return stream;
    }
  };
}