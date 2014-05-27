/**
 * Create a visitor that traverses a tree.
 *
 * To register a handler for a certain node type add a method to `on`.
 * To recursivly visit child nodes invoke `this.visit(node.children)`.
 *
 * Each node is processed according to following rules:
 *
 * - If the node is `undefined` return `undefined`
 * - If the node is an array (and on._array does not exit) visit each item and
 *   return an array with the results.
 * - If the node has a `type` property invoke `on[type](node)` if it exists,
 *   otherwise look for a function called `_<typeof node>`.
 * - If no such function exists, return `undefined`
 *   unless the node is a string, in which case it is returned as-is.
 */
function visitor(on) {

  return {
    visit: function(node, ctx) {
      if (typeof ctx != 'object') ctx = this
      else if (ctx != this) ctx.__proto__ = this

      function handle(node, fn) {
        try {
          return fn.call(ctx, node)
        }
        catch (err) {
          var pos = node.position || node.file
          if (pos) err.stack = pos + '\n' + err.stack
          throw err
        }
      }

      // skip undefined and null values
      if (node === undefined || node === null) return

      if (Array.isArray(node)) {

        // custom array handling
        if (on._array) return handle(node, on._array)

        // default: visit each item and return mapped result
        return node.map(function(item) {
          return this.visit(item, ctx)
        }, this)
        .filter(function(i) {
          return i !== undefined
        })
      }

      // look for a `type` property
      var t = node.type
      if (t && on[t]) return handle(node, on[t])

      // fall back to _<typeof>
      t = '_' + typeof node
      if (on[t]) return handle(node, on[t])

      // return strings verbatim by default
      if (typeof node == 'string') return node
    }
  }

}

module.exports = visitor

visitor.visit = function(obj, on) {
  return visitor(on).visit(obj)
}
