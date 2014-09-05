exports.flatten = require('flatten')
exports.range = require('ranged')
exports.dom = require('./domutils')

exports.get = function(obj, prop) {
  if (!obj) return
  // TODO Convert blocks into POJOs with children prop!
  if (obj.type == 'block' && obj.props) return obj.props[prop]
  return obj[prop]
}

/**
 * Invoke the iterator function for each item in the list and return the results.
 */
exports.each = function(list, as, scope, iterator) {
  if (!Array.isArray(list) && list.children) list = list.children
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
