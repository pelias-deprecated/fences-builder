# openstreetmap-boundaries

This module extracts administrative boundary polygons from openstreetmap data files.
It's currently using [node-osmium](https://github.com/osmcode/node-osmium) to do most of the work, and simply filtering
the generated polygons using tags.

[![NPM](https://nodei.co/npm/pelias-openstreetmap-boundaries.png)](https://nodei.co/npm/pelias-openstreetmap-boundaries/)

Note: you will need `node` and `npm` installed first.

The easiest way to install `node.js` is with [nave.sh](https://github.com/isaacs/nave) by executing `[sudo] ./nave.sh usemain stable`


## Installation

```bash
$ npm install pelias-openstreetmap-boundaries
```

## Usage

There is config.json in the project's etc directory. You can define the following parameters.

```javascript
    {
        "inputFile": "path/to/input/file",
        "inputType": "pbf/osm or any osmium supported type" // defaults to "pbf"
        "outputFile": "path/to/output/file" // currently geojson only
        "filterTags": {
            "boundary": { "administrative": true }, // accept objects where boundary == administrative
            "admin_level": true // accept objects where admin_level == <any>
        }
    }
```

Once config is to your liking, run as follows.

```bash
$ npm start
```

### Notes

Currently node-osmium is being used to generate the polygons and this module simply filters them
according to configured tags. This is proving to be relatively slow and resource intensive for
large OSM extracts. It's important to note that the number of administrative boundary areas
is relatively small compared to the total number of areas found in a given OSM file.
Presumably building the polygons manually with a double-pass approach might prove to be
more optimal for this use case.


## Running Unit Tests

```bash
$ npm test
```


### Continuous Integration

[![Build Status](https://travis-ci.org/pelias/openstreetmap-boundaries.svg?branch=master)](https://travis-ci.org/pelias/openstreetmap-boundaries)

