var visitor = require('../visitor')
  , fs = require('fs')
  , path = require('path')
  , findup = require('findup-sync')
  , pluck = require('plck')
  , matching = require('matching')
  , addUnique = require('../util/addUnique')

module.exports = function(ast, ctx) {


  function getClass(file) {
    var root = ctx.root
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
  }

  var i = 1
  function syntheticClass(el) {
    return (el.tag || el.name) + '-' + i++
  }

  var v = visitor({

    root: function(ast) {
      this.visitChildren(ast, ast.root)
      return ast
    },

    fragment: function(node) {
      this.visitChildren(node, node.declarations)
    },

    element: function(node) {
      if (node.isRoot) {
        node.class = getClass(ast.file)
      }
      else if (this.isAmbiguous(node)) {
        node.class = syntheticClass(node)
      }

      this.visitChildren(node, node.declarations)
    },


    reference: function(node) {
      if (node.isRoot) {
        node.class = getClass(ast.file)
      }
      else if (node.styled) {
        node.class = this.parent.class + '_' + getClass(node.name)
      }
      this.visitChildren(node, node.declarations)
    },

    _object: function(obj) {
      this.visitProps(obj)
    }

  })

  return v.visit(ast, {
    isAmbiguous: function(el) {
      // If it has a class asume it's unique
      if (el.class) return

      // Ignore unstylable elements
      if ( /^(head|script|link)$/i.test(el.tag)) return

      // If the parent is a component we need a class as we don't know where the
      // element will end up in the hierarchy
      if (!this.parent) return

      // el is passed as paramter so we can't know where it will end up
      if (this.parent.type == 'reference') return true

      // look at the sibling stats
      var t = this.parent.tags
      if (t.count['*']) return true
      return t.styled[el.tag || '*'] && (t.count['*'] || t.count[el.tag] > 1)
    }
  })

}
