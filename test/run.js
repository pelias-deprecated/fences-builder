
var tape = require('tape');
var common = {};

var tests = [
  require('./test_fencesBuilder'),
  require('./test_polygonExtractor'),
  require('./test_streamFactory')
];

tests.map(function(t) {
  t.all(tape, common);
});