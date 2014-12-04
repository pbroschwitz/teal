var xtend = require('xtend')

/**
 * Create a visitor that traverses a tree.
 *
 * To register a handler for a certain node type add a method to `on`.
 * To recursivly visit child nodes invoke `this.visit(node.children)`.
 *
 * Each node is processed according to following rules:
 *
 * - If the node is `undefined` return `undefined`
 * - If the node has a `type` property invoke `on[type](node)` if it exists,
 *   otherwise look for a function called `_<typeof node>`.
 * - If no such function exists return the node verbatim
 */
function visitor(on) {

  var api = {

    mapObject: function(o, ctx) {
      if (Array.isArray(o)) return this.mapArray(o, ctx)
      var m = {}
      for (var k in o) m[k] = this.visit(o[k], ctx)
      return m
    },

    visitObject: function(o, ctx) {
      if (Array.isArray(o)) return this.visitArray(o, ctx)
      for (var k in o) this.visit(o[k], ctx)
      return o
    },

    visitArray: function(a, ctx) {
      a.forEach(function(item) {
        return this.visit(item, ctx)
      }, this)
      return a
    },

    mapArray: function(a, ctx) {
      return a.map(function(item) {
        return this.visit(item, ctx)
      }, this)
    },

    visit: function(node, ctx) {
      ctx = ctx ? xtend(this, ctx) : this
      function handle(node, fn) {
        try {
          return fn.call(ctx, node)
        }
        catch (err) {
          var pos = node.position
          if (pos && !err.location) err.location = pos.toString()
          if (!err.file) err.file = pos && pos.file || node.file
          throw err
        }
      }

      // skip undefined and null values
      if (node === undefined || node === null) return node

      // look for a `type` property
      var t = node.type
      if (t && on[t]) return handle(node, on[t])

      // fall back to _<typeof>
      t = '_' + typeof node
      if (on[t]) return handle(node, on[t])

      return node
    }
  }
  return xtend(api, on._context)
}

module.exports = visitor

visitor.visit = function(obj, on) {
  return visitor(on).visit(obj)
}
