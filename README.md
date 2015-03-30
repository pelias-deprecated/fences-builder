# fences-builder

This module extracts administrative boundary polygons from openstreetmap data files.
It's currently using [node-osmium](https://github.com/osmcode/node-osmium) to do most of the work, and simply filtering
the generated polygons using tags.

[![NPM](https://nodei.co/npm/fences-builder.png)](https://nodei.co/npm/fences-builder/)

Note: you will need `node` and `npm` installed first.

The easiest way to install `node.js` is with [nave.sh](https://github.com/isaacs/nave) by executing `[sudo] ./nave.sh usemain stable`


## Installation

```bash
$ npm install fences-builder
```

## Usage

### standalone utility

This utility needs the following parameters.

| Parameter | Description |
| --- | --- |
| `inputFile` | Path to input file. Must be a valid OSM data file (pbf, osm, etc.) |
| `outputDir` | Path to an existing directory that will contain output files for each admin_level. |

```bash
$ fences-builder --inputFile=<file> --outputDir=<dir>
```

### dependency module

```javascript
var FencesBuilder = require('fences-builder');

var builder = new FencesBuilder(inputFile, outputDir);

builder.start(function (err, results) {
  if (err) {
    console.error(colors.red('[Error]:'), err.message);
  }
  else {
    console.log(colors.blue('[Results]:'), results);
  }
});
```

## Known Issues

 * Osmium parser has been separated into a child process because it doesn't respect node's event loop.
 * Cannot run with full planet file as input. Process runs out of memory.
  It is recommended that the planet data is pre-filtered
  using [osmfilter](http://wiki.openstreetmap.org/wiki/Osmfilter) or some other similar utility.


## Running Tests

```bash
$ npm test
```

<i>Note: the tests don't attempt to verify osmium functionality, we trust that things are working as expected there.</i>


### Continuous Integration

[![Build Status](https://travis-ci.org/pelias/fences-builder.svg?branch=master)](https://travis-ci.org/pelias/fences-builder)

