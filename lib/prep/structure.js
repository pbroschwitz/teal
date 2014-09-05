var addUnique = require('../util/addUnique')
  , visitor = require('../visitor')
  , findup = require('findup-sync')
  , flatten = require('flatten')
  , fs = require('fs')
  , path = require('path')
  , pluck = require('plck')

module.exports = visitor({

  _context: {

    /**
     * Adds the node's meta data to the parent's stats. These counts are used
     * to determine if a node requires a className or whether it can be styled
     * using a child selector and its tag name.
     */
    countTag: function(node) {
      if (!this._parent) {
        // no parent, no siblings - hence we don't have to count anything
        return
      }

      // get (or create) the parent's stats object
      var t = this._parent.tags
      if (!t) t = this._parent.tags = { count: {}, styled: {} }

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

    //if (!ast.root) {
    //  // the file has no root element (only settings) so we are done
    //  return ast
    //}

    // mark the root node as actual root, i.e. not a mixed in one
    // not sure if this is still needed

    //ast.root.isRoot = true

    this.visit(ast.root, { ast: ast })
    return ast
  },

  element: function(node) {

    // add an array to collect this node's state names
    node.states = []

    if (node.name.path) {
      // parse the referenced file
      var ast = this.parse(node.name.path)
      if (ast && ast.root) {
        if (ast.root.type == 'mixin') {
          // mix in the referenced declarations
          node.mixin = ast.root.declarations
          if (this._parent) this._parent.styled = true
        }
        else {
          // Peek into the referenced file get the tag name of its root element.
          // This isn't optimal yet, as we only go one level deep. To fix this
          // we could write a method that recursively parses files and performs
          // this structural processing. Ideally this would go into
          // SubContext#parse to keep the parser itself pure. The SubContext
          // colud then also cache the AST.
          node.tag = ast.root.name
        }
      }
    }
    else {
      node.tag = node.name
    }

    this.visitChildren(node, [
      node.declarations,
      node.attributes,
      node.children
    ])

    if ('tag' in node) this.countTag(node)
  },


  mixin: function(node) {
    // add an array to collect this node's state names
    node.states = []
    this.visitChildren(node, node.declarations)
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
    // mark the parent element as being styled
    if (this._parent) this._parent.styled = true
    this.visit(node.value)
  },

  _object: function(obj) {
    return this.mapObject(obj)
  }

})
