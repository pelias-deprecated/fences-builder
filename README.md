# openstreetmap-polygons

This module extracts administrative boundary polygons from openstreetmap data files.
It's currently using [node-osmium](https://github.com/osmcode/node-osmium) to do most of the work, and simply filtering
the generated polygons using tags.

[![NPM](https://nodei.co/npm/pelias-openstreetmap-polygons.png)](https://nodei.co/npm/pelias-openstreetmap-polygons/)

Note: you will need `node` and `npm` installed first.

The easiest way to install `node.js` is with [nave.sh](https://github.com/isaacs/nave) by executing `[sudo] ./nave.sh usemain stable`


## Installation

```bash
$ npm install pelias-openstreetmap-polygons
```

## Usage

There is config.json in the project's etc directory. You can define the following parameters.

```javascript
    {
        "inputFile": "path/to/input/file",
        "outputDir": "path/to/output/directory"
    }
```

Once config is to your liking, run as follows.

```bash
$ npm start
```

### Notes

Osmium parser has been separated into a child process because it doesn't respect
node's event loop.

## Running Unit Tests

```bash
$ npm test
```


### Continuous Integration

[![Build Status](https://travis-ci.org/pelias/openstreetmap-polygons.svg?branch=master)](https://travis-ci.org/pelias/openstreetmap-polygons)

