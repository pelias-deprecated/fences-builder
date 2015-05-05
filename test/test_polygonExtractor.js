var EventEmitter = require('events').EventEmitter;

// this is used to stub out required dependencies
var proxyquire = require('proxyquire');
proxyquire.noPreserveCache();

module.exports.tests = {};

module.exports.tests.areaHandler = function(test) {

  var options = {
    inputFile: 'input_file',
    outputDir: 'output_dir'
  };

  function makeChildProcessStub(options, t) {
    var child = new EventEmitter();

    child.send = function (msg) {
      t.equal(msg.type, 'start', 'start msg sent');
      t.equal(msg.data.inputFile, options.inputFile, 'input file is set');
    };

    return {
      child: child,
      fork: function () {
        return child;
      }
    };
  }

  function makeStreamFactoryStub(options, t) {
    var stream = {
      write: function (data) {
        t.assert(data, 'steam input data exists');
      }
    };

    return {
      expectedLevel: '',
      done: function () {
      },
      getLevelStream: function (outputDir, level) {
        t.deepEqual(outputDir, options.outputDir, 'output dir is set');
        t.equal(level, this.expectedLevel, 'admin_level is set');
        t.end();
        return stream;
      }
    };
  }

  test('should split output into files by admin_level', function (t) {

    var streamFactory = makeStreamFactoryStub(options, t);
    var childProcess = makeChildProcessStub(options, t);

    var PolygonExtractor = proxyquire('./../src/PolygonExtractor',
      {
        'child_process': childProcess,
        './streamFactory': streamFactory
      });

    var inst = new PolygonExtractor(options.inputFile, options.outputDir);

    inst.start();

    streamFactory.expectedLevel = '8';
    streamFactory.done = t.end;

    // emitting this event will trigger _areaHandler
    childProcess.child.emit('message', {type: 'area', data: {properties: {admin_level: '8'}}});
  });

  test('should direct invalid admin_level areas into "other"', function (t) {
    var streamFactory = makeStreamFactoryStub(options, t);
    var childProcess = makeChildProcessStub(options, t);

    var PolygonExtractor = proxyquire('./../src/PolygonExtractor',
      {
        'child_process': childProcess,
        './streamFactory': streamFactory
      });

    var inst = new PolygonExtractor(options.inputFile, options.outputDir);

    inst.start();

    streamFactory.expectedLevel = 'other';
    streamFactory.done = t.end;

    // emitting this event will trigger _areaHandler
    childProcess.child.emit('message', {type: 'area', data: {properties: {admin_level: 'some/invalid/value'}}});
  });
};


module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('PolygonExtractor ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};
