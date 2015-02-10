var through = require('through2');
var osmium_stream = require('./osmium_stream');

module.exports = function extractPolygons(options, index, callback) {

  var osmiumStream = osmium_stream( options.inputFile, options.inputType );

  var nodeStream = through.obj( function( object, enc, next ) {
    if (object.type === 'node' && index.nodes[object.id] === true) {
      index.nodes[object.id] = [object.lon, object.lat];
    }
    next();
  });

  osmiumStream
    .pipe( nodeStream );

  nodeStream.on('finish', function () {
    callback(null, index);
  });
};