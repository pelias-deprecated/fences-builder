var logger = require('./util/logger');
var through = require('through2');

/**
 * Transform stream that filters out objects not matching specified tags
 *
 * @param tags Object Specifies which objects to filter based on tag values
 * {
 *   tag_name: true, // any value for this tag
 *   tag_name: { value1: true, value2: true } // only where tag_name=value1
 * }
 * @return Transform stream
 */
module.exports = function tag_filter(tags) {

  var stream = through.obj( function _filter(area, enc, next) {

    if (tags) {
      var wanted = false;
      for (var tag in tags) {
        if ( tags.hasOwnProperty(tag) ) {
          if (area.properties[tag] && (tags[tag] === true || tags[tag][area.properties[tag]] === true)) {
            wanted = true;
            break;
          }
        }
      }
      if (!wanted) {
        next();
        this.stats.discarded++;
        return;
      }
    }

    this.push(area);
    this.stats.matched++;
    next();
  });

  stream.on('error', function (err) { logger.error(err); });

  stream.stats = {
    matched: 0,
    discarded: 0
  };

  return stream;
};