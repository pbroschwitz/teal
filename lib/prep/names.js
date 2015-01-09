var fs = require('fs')
var path = require('path')

var findup = require('findup-sync')

var addToProp = require('../util/addToProp')
var addUnique = require('../util/addUnique')
var visitor = require('../visitor')

module.exports = visitor({

  _context: {

    /**
     * Convert a path into a class name.
     */
    getComponentClass: function(ref) {
      var p = ref
        .replace(/\..+$/, '')    // strip the file extension
        .replace(/\/index$/, '') // strip -index

      var dir = path.dirname(p)
      var name = path.basename(p)
      var mod
      var i = dir.indexOf('/')
      if (i > 0) {
        mod = dir.substr(0, i)
        dir = dir.substr(i)
        return this.naming.npmComponent(mod, dir, name)
      }
      return this.naming.component(dir, name)
    }

  },

  root: function(ast) {
    this.visit(ast.root, { ast: ast, count: {} })
    return ast
  },

  element: function(node) {
    if (node.mixin) return
    if (node == this.ast.root) {
      // root element, use the file name to derive the class
      node.class = this.getComponentClass(this.ast.path)
    }
    else if (node.declarations && node.declarations.length) {
      // ... a styled descendant
      var rootClass = this.ast.root.class

      var sub = node.ref
        ? this.getComponentClass(node.ref)
        : this.naming.descendant(node.class, node.tag)

      var c = this.count[sub] || 0
      node.class = this.naming.sub(rootClass, sub, this.count[sub] = ++c)
    }

    this.visitObject(node)
  },

  _object: function(obj) {
    this.visitObject(obj)
  }

})
