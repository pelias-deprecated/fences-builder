
var tape = require('tape');
var common = {};

var tests = [
  require('./test_fencesBuilder'),
  require('./test_polygonExtractor')
];

tests.map(function(t) {
  t.all(tape, common);
});