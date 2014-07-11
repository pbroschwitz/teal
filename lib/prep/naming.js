var visitor = require('../visitor')
  , fs = require('fs')
  , path = require('path')
  , findup = require('findup-sync')
  , pluck = require('plck')
  , matching = require('matching')
  , addUnique = require('../util/addUnique')

module.exports = {

  _context: {
    getClass: function(file) {
      var root = this.ctx.root
      var prefix = ''
      if (!~file.indexOf(root)) {
        // a node module
        var dir = path.dirname(file)
        var pkg = findup('package.json', { cwd: dir, nocase: true })
        root = path.dirname(pkg)
        prefix = path.basename(root)
      }
      return file.replace(root, prefix)
        .replace(/\//g, '-')
        .replace(/^-/, '')
        .replace(/\..+$/, '')
        .replace(/\-index$/, '')
    },

    syntheticClass: function(el) {
      return (el.tag || el.name) + '-' + this.anonymousCount++
    },

    isAmbiguous: function(el) {
      // If it has a class asume it's unique
      if (el.class) return

      // Ignore unstylable elements
      if ( /^(head|script|link)$/i.test(el.tag)) return

      if (!this.parent) return

      // look at the sibling stats
      var t = this.parent.tags

      if (t.count['*']) return true
      return t.styled[el.tag || '*'] && (t.count['*'] || t.count[el.tag] > 1)
    }
  },

  root: function(ast) {
    this.visitChildren(ast, ast.root, { ast: ast, anonymousCount: 1 })
    return ast
  },

  fragment: function(node) {
    this.visitChildren(node, node.declarations)
  },

  element: function(node) {
    if (node.isRoot) { // == this.ast.root
      node.class = this.getClass(this.ast.file)
    }
    else if (this.isAmbiguous(node)) {
      node.class = this.syntheticClass(node)
    }

    this.visitChildren(node, node.declarations)
  },


  reference: function(node) {
    if (node.mixin) return
    if (node.isRoot) {
      node.class = this.getClass(this.ast.file)
    }
    else if (node.styled) {
      var suffix = this.isAmbiguous(node)
        ? this.syntheticClass(node)
        : this.getClass(node.name)

      node.class = this.ast.root.class + '_' + suffix
    }
    this.visitChildren(node, node.declarations)
  },

  _object: function(obj) {
    return this.mapObject(obj)
  }
}
