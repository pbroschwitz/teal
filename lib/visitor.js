/**
 * Create a visitor function that traverses a tree. The passed function takes
 * two parameters: `on` and `visit`.
 *
 * To register a handler for a certain node type add a method to `on`.
 * To recursivly visit child nodes invoke `visit(node.children)`.
 *
 * Each node is processed according to following rules:
 *
 * If the node is `undefined` return an empty array.
 * If the node is an array visit each item and return an array with the results.
 * If the node has a `type` property invoke `on[type](node)` if it exists,
 * otherwise look for a function called `_<typeof node>`.
 * If no such function exists, return `undefined` ...
 * unless the node is a string, in which case it is returned as-is.
 */
module.exports = function(fn) {
  var on = {}
  function visit(node) {
    if (node === undefined) return []
    if (Array.isArray(node)) {
      return node.map(visit).filter(function(i) {
        return i !== undefined
      })
    }

    var t = node.type
    if (t && on[t]) return on[t](node)

    t = '_' + typeof node
    if (on[t]) return on[t](node)

    if (typeof node == 'string') return node
  }
  fn(on, visit)
  return visit
}
