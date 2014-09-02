exports.flatten = require('flatten')

/**
 * Helper function to convert rules like `first:Foo rest:(',' Foo)*` into
 * an array. The optional index argument specifies the position of the item
 * in the `rest:(...)` group.
 */
exports.list = function(first, rest, index) {
  if (first === null) return []
  if (!rest.length) return [first]
  if (typeof index == 'number') rest = rest.map(function(item) {
    return item[index]
  })
  return [first].concat(rest)
}

/**
 * Helper function to handle recursive structures.
 */
exports.tree = function(first, rest, builder) {
  var result = first, i
  for (i = 0; i < rest.length; i++) {
    result = builder(result, rest[i])
  }
  return result
}
