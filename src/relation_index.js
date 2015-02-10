var through = require('through2');
var osmium_stream = require('./osmium_stream');

module.exports = function extractPolygons(options, callback) {

  var osmiumStream = osmium_stream( options.inputFile, options.inputType );

  var index = {
    nodes: {},
    ways: {},
    relations: {}
  };

  var indexStream = through.obj( function( object, enc, next ) {
    if (object.type === 'way') {
      index.ways[object.id] = object;
      object.refs.forEach(function (node) {
        index.nodes[node] = true;
      });
    }
    // else we know it's a relation
    else {
      index.relations[object.id] = object;
    }
    next();
  });

  osmiumStream
    .pipe( through.obj( function (object, enc, next ) {
      if (object.type === 'relation' || object.type === 'way') {
        if (object.tags && object.tags.boundary === 'administrative' ) {
          this.push(object);
        }
      }
      next();
    }))
    .pipe( indexStream );

  indexStream.on('finish', function () {
    callback(null, index);
  });
};