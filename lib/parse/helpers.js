var addToProp = require('../util/addToProp')

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


exports.addContent = function(node, list) {
  var attr = []
  var children = []
  var decl = []

  list.forEach(function(d) {
    if (d.type == 'attribute') attr.push(d)
    else if (d.type == 'declaration') decl.push(d)
    else if (d.type == 'css') decl.push(d.css)
    else children.push(d)
  })

  addToProp(node, 'attributes', attr)
  addToProp(node, 'children', children)
  addToProp(node, 'declarations', decl)
  return node
}
