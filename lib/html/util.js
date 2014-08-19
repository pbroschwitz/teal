exports.flatten = require('flatten')
exports.range = require('ranged')

exports.get = function(obj, prop) {
  return obj && obj[prop]
}

exports.classes = function(scope, base, states) {
  var cls = []
  if (base) cls.push(base)
  if (states) cls = cls.concat(states.filter(scope.get, scope))
  return cls.join(' ')
}

/**
 * Invoke the iterator function for each item in the list and return the results.
 */
exports.each = function(list, as, scope, iterator) {
  if (list) return list.map(function(item) {
    var s = {}
    s[as] = item
    return iterator(scope.sub(s))
  })
}

/**
 * Return the length of the list or `0` if no list is given.
 */
exports.length = function(obj) {
  return (obj||'').length
}

exports.json = function(v) {
  return JSON.stringify(v)
}

exports.uri = function(v) {
  return encodeURI(v)
}

exports.uricomp = function(v) {
  return encodeURIComponent(v)
}
