var fs = require('fs')
var path = require('path')

var findup = require('findup-sync')
var flatten = require('flatten')

var visitor = require('../visitor')

module.exports = visitor({

  _context: {

    /**
     * Adds the node's meta data to the parent's stats. These counts are used
     * to determine if a node requires a className or whether it can be styled
     * using a child selector and its tag name.
     */
    countTag: function(node) {
      if (!this.parent) {
        // no parent, no siblings - hence we don't have to count anything
        return
      }

      // get (or create) the parent's stats object
      var t = this.parent.tags
      if (!t) t = this.parent.tags = { count: {}, styled: {} }

      var n = node.tag || '*'
      if (!n) return

      t.count[n] = (t.count[n] || 0) + 1

      if (node.styled) {
        // remeber that there is at least one styled node with this name
        t.styled[n] = true
      }
    }
  },

  root: function(ast) {
    // add an array to collect the state names
    ast.states = []

    this.visit(ast.root, { ast: ast })
    return ast
  },

  path: function(node) {
    node.path = this.resolve(node.path)
  },

  element: function(node) {
    var ast
    this.visit(node.name)
    if (node.name.path) {
      ast = this.parse(node.name.path)
      if (ast && ast.root) {
        if (ast.root.type == 'mixin') {
          // mix in the referenced content
          node.mixin = ast.root
          if (this.parent) this.parent.styled = true
        }
        else {
          node.tag = ast.root.name
          if (ast.root.class) node.class = ast.root.class
          if (ast.selectors) node.contentSelectors = ast.selectors
        }
      }
    }
    else {
      node.tag = node.name
    }

    var ctx = { parent: node }
    this.visit(node.declarations, ctx)
    this.visit(node.attributes, ctx)
    this.visit(node.children, ctx)
    if (!ast || node.tag) this.countTag(node)
  },


  mixin: function(node) {
    var ctx = { parent: node }
    this.visit(node.declarations, ctx)
    this.visit(node.attributes, ctx)
    this.visit(node.children, ctx)
  },


  declaration: function(node) {
    // mark the parent element as being styled
    if (this.parent) this.parent.styled = true
    this.visit(node.value)
  },

  _object: function(obj) {
    this.visitObject(obj)
  }

})
