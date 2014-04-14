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
exports.each = function(list, scope, iterator) {
  if (list) return list.map(function(item) {
    return iterator(scope.sub(item))
  })
}

/**
 * Return the length of the list or `0` if no list is given.
 */
exports.length = function(obj) {
  return (obj||'').length
}

/**
 * Return a list that contains the numbers from `start` to `stop`.
 */
exports.range = function(start, stop, step) {
  if (arguments.length <= 1) {
    stop = start || 0
    start = 0
  }
  if (!step) step = 1
  var length = Math.max(Math.ceil((stop - start) / step), 0) + 1
  var i = 0
  var range = new Array(length)
  while (i < length) {
    range[i++] = start
    start += step
  }
  return range
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

// Expose Math functions
var math = ['min', 'max', 'ceil', 'floor', 'round', 'sqrt', 'pow']
math.forEach(function(method) {
  exports[method] = function() {
    return Math[method].apply(this, arguments)
  }
})
