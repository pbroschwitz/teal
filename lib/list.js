/**
 * Filter the list so that each item is only contained once.
 */
exports.unique = function(list) {
  return list.filter(function(item, i) {
    return i == list.indexOf(item)
  })
}

/**
 * Filter the list of nodes by the given type.
 */
exports.grep = function(list, type) {
  return list.filter(function(node) { return node.type == type })
}

/**
 * Extract a property from a list of objects.
 */
exports.pluck = function(list, prop) {
  return list.map(function(obj) { return obj[prop] })
}

/**
 * Flatten a list of nested arrays.
 */
exports.flatten = function(list) {
  if (!Array.isArray(list)) return list
  return list.reduce(function (acc, item) {
    return acc.concat(exports.flatten(item))
  }, [])
}
