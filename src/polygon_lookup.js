var _ = require('lodash');
var fs = require('fs');
var geojson = require('geojson-stream');

module.exports = function polygonLookup(index, callback) {

  var geostream = geojson.stringify();
  var outputFile = fs.createWriteStream('./new_output.geojson');

  geostream.pipe(outputFile);

  _.forEach(index.ways, function (way) {
    way.nodes = _.map(way.refs, function (ref) {
      return index.nodes[ref] || null;
    });
  });

  _.forEach(index.relations, function (relation) {
    var coordinates = _.map(relation.members, function (member) {
      if (member.type === 'w' && member.role === 'outer') {
        return index.ways[member.ref].nodes;
      }
    }).filter(function (coord) { return coord; });

    if (coordinates[0] !== coordinates[coordinates.length - 1]) {
      coordinates.push(coordinates[0]);
    }
    if (coordinates.length < 4) {
      return;
    }

    var tags = _.map(relation.members, function (member) {
      if (member.type === 'w' && member.role === 'outer') {
        return index.ways[member.ref].tags;
      }
    }).filter(function (tag) { return tag; });

    if (coordinates.length === 0) {
      return;
    }

    //console.log(coordinates);

    var json = {
      type: 'Feature',
      name: relation.id,
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[coordinates]]
      }
    };
    if (tags && tags.length > 0) {
      json.properties = tags;
    }
    geostream.write(json);

  });

  geostream.end();


  callback();
};

