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

exports.addUnique = function(list, items) {
  if (items) items.forEach(function(i) {
    if (!~list.indexOf(i)) list.push(i)
  })
  return list
}

/**
 * Returns a bound function that adds items to the given `list`.
 */
exports.addTo = function(list) {
  return function(items) {
    list.push.apply(list, items)
  }
}

/**
 * Return a new list with all items in list `b` appended to each item in
 * list `a`
 */
exports.cartesian = function(a, b, combinator) {
  if (!Array.isArray(b)) b = [b]
  if (!a) return b
  var result = []
  var add = exports.addTo(result)
  b.forEach(function(s) {
    add(exports.append(a, s, combinator))
  })
  return result
}

/**
 * Return a new list with `str` appended to each item in `list`.
 */
exports.append = function(list, str, combinator) {
  return list.map(function(i) { return i + (combinator||'') + str })
}

exports.dict = function(list, key, value) {
  var ret = {}
  list.forEach(function(item) {
    ret[item[key||'name']] = item[value||'value']
  })
  return ret
}
