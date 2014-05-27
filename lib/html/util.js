var scope = require('../scope')

exports.scope = function(args, $this, defaults) {
  var data = args[0] || {}
  if (args.length > 1) {
    data.content = Array.prototype.slice.call(args, 1)
  }
  if ($this) data["this"] = $this
  return scope(data, scope(defaults))
}

exports.classes = function(scope, base, states) {
  var cls = []
  if (base) cls.push(base)
  return cls.concat(states.filter(scope.get, scope)).join(' ')
}

/**
 * Merges all properties of `b` into `a` whoes keys are not in `a`.
 */
exports.merge = function(a, b) {
  for (var k in b) if (!(k in a)) a[k] = b[k]
  return a
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

exports.flatten = function(list) {
  if (!Array.isArray(list)) return [list]
  return list.reduce(function(acc, item) {
    return acc.concat(exports.flatten(item))
  }, [])
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
