/**
 * NOTE: this is a placeholder for the new pelias-logger module
 */

var winston = require('winston');

module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: true,
      colorize: true,
      level: 'verbose'
    })
  ]
});
