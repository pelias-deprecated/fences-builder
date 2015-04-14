var NAME_KEYS = [
  'name',
  'type',
  'tiger:NAME'
];

/**
 * Check if all needed tags are in place
 *
 * @param {object} obj
 * @returns {boolean}
 */
module.exports.checkAdminTags = function checkAdminTags(obj) {
  return obj.tags('name') &&
    obj.tags('boundary') === 'administrative' &&
    obj.tags('admin_level');
};

/**
 * Concat properties to compile index id
 *
 * @param {object} obj
 * @returns {string}
 */
module.exports.buildIndexId = function buildIndexId(obj) {
  return obj.tags('name') + ':admin_level_' + obj.tags('admin_level');
};

/**
 * Find name tag
 *
 * @param {object} obj
 * @returns {string|undefined}
 */
module.exports.findNameTag = function findNameTag(obj) {
  var name;
  var tags = obj.tags();

  NAME_KEYS.every(function (key) {
    name = tags[key];
    return !name; // stop if a name is found
  });

  return name;
};
