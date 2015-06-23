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
module.exports.buildIndexId = function buildIndexId(type, id) {
  return type + ':' + id;
};

/**
 * Find name tag
 *
 * @param {object} obj
 * @returns {string|null}
 */
module.exports.findNameTag = function findNameTag(obj) {
  var tags = obj.tags();
  var count = NAME_KEYS.length;

  for(var i=0; i<count; i++) {
    if (tags[NAME_KEYS[i]]) {
      return tags[NAME_KEYS[i]];
    }
  }

  return null;
};
