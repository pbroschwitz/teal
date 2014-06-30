var addUnique = require('../util/addUnique')
  , findup = require('findup-sync')
  , flatten = require('flatten')
  , fs = require('fs')
  , path = require('path')
  , pluck = require('plck')

module.exports = {

  _context: {
    countTag: function(node) {
      if (!this._parent) return

      var t = this._parent.tags
      if (!t) t = this._parent.tags = { count: {}, styled: {} }

      var n = node.tag
      if (!n) return

      var c = t.count[n] || 0
      t.count[n] = c + 1

      if (node.styled) t.styled[n] = true
    }
  },

  root: function(ast) {
    //ast.vars = []
    ast.states = []
    this.visit(ast.settings)
    if (!ast.root) return ast
    ast.root.isRoot = true
    this.visit(ast.root, { ast: ast })
    return ast
  },

  element: function(node) {
    node.states = []
    this.visitChildren(node, node.declarations)
    this.countTag(node)
  },

  fragment: function(node) {
    this.visitChildren(node, node.declarations)
  },

  mixin: function(node) {
    node.states = []
    this.visit(node.declatrations)
  },

  reference: function(node) {
    var ast = this.ctx.parse(node.path)
    if (ast && ast.root) {
      if (ast.root.type == 'mixin') {
        node.mixin = ast.root.declarations
      }
      else {
        node.name = path.basename(node.path)
        node.tag = ast.root.tag || '*'
      }
    }
    node.states = []
    this.visitChildren(node, node.declarations)
    this.countTag(node)
  },

  style: function(style) {
    // collect all states ...
    style.states = pluck('state', style.selectors).filter(Boolean)

    // ... and add them to the parent node
    addUnique(this.parent.states, style.states)

    // ... as well as to the root
    addUnique(this.ast.states, style.states)

    this.visit(style.declarations)
  },

  declaration: function(node) {
    if (this._parent) this._parent.styled = true
    this.visit(node.value)
  },

  _object: function(obj) {
    return this.mapObject(obj)
  }
}
