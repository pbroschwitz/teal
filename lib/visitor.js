var xtend = require('xtend')
  , materialize = require('materialize')

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
    visitChildren: function(node, children, ctx) {
      var n = xtend(node, { children: [] }, treeApi)
      if (this.parent) {
        this.parent.append(n)
      }
      return this.visit(children, xtend({ parent: n, _parent: node }, ctx))
    },

    mapObject: function(o, ctx) {
      if (Array.isArray(o)) return this.mapArray(o, ctx)
      return materialize(Object.keys(o).map(function(key) {
        return { name: key, value: this.visit(o[key], ctx) }
      }, this))
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
          var pos = node.position || node.file
          if (pos && !err.location) {
            err.file = pos.file
            err.location = pos.toString()
          }
          throw err
        }
      }

      // skip undefined and null values
      if (node === undefined || node === null) return

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

var treeApi = {
  up: function(count) {
    if (count === undefined) count = 1
    var n = this
    for (var i=0; i<count; i++) {
      n = n.parent
    }
    return n
  },

  level: function() {
    var l = 0, n = this.parent
    while (n) {
      n = n.parent
      l++
    }
    return l
  },

  prev: function(count) {
    if (count === undefined) count = 1
    var s = this.up().children
    var i = s.indexOf(this)
    return s[i-count]
  },

  append: function(n) {
    n.parent = this
    this.children.push(n)
  }
}

module.exports = visitor

visitor.visit = function(obj, on) {
  return visitor(on).visit(obj)
}
