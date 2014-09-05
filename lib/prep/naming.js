var visitor = require('../visitor')
  , fs = require('fs')
  , path = require('path')
  , findup = require('findup-sync')
  , pluck = require('plck')
  , addUnique = require('../util/addUnique')

module.exports = visitor({

  _context: {

    /**
     * Convert a path into a class name.
     */
    getClass: function(file) {

      var root = this.root
      var prefix = ''

      if (!~file.indexOf(root)) {
        // path outside the view folder - must be a CommonJS module
        var dir = path.dirname(file)

        // look for package.json
        var pkg = findup('package.json', { cwd: dir, nocase: true })

        // use that dir as root and the module-name as prefix
        root = path.dirname(pkg)
        prefix = path.basename(root)
      }

      return file
        .replace(root, prefix)   // root -> prefix
        .replace(/\//g, '-')     // slash -> dash
        .replace(/^-/, '')       // strip leading dash
        .replace(/\..+$/, '')    // strip the file extension
        .replace(/\-index$/, '') // strip -index
    },

    syntheticClass: function(el) {
      var c = el.tag || 'e'
      if (!this.count[c]) this.count[c] = 0
      return c + '_' + ++this.count[c]
    },

    isAmbiguous: function(el) {
      // ignore root nodes
      if (!this.parent) return

      // ignore unstyleable elements
      if ( /^(head|script|link)$/i.test(el.tag)) return

        // if it has a class asume it's unique
      if (el.class) return

      // look at the sibling stats
      var t = this.parent.tags

      // check if there are siblings with unknown tags
      if (t.count['*']) return true

      // ok if there aren't siblings with the same tag
      if (el.tag && !t.styled[el.tag]) return

      return t.count['*'] || t.count[el.tag] > 1
    }
  },

  root: function(ast) {
    this.visit(ast.root, { ast: ast, count: {} })
    return ast
  },

  element: function(node) {
    if (node.mixin) return
    var isRef = node.name.path
    if (!this.parent) {
      node.absolute = true
      node.class = this.getClass(this.ast.file)

    }
    else if (node.styled) {
      if (this.isAmbiguous(node)) {
        node.class = this.syntheticClass(node)
      }
      if (this.isRefChild) {
        node.class = this.ast.root.class + '_' + (node.class || node.tag)
        node.absolute = true
      }

    }

    this.visitChildren(node, [
      node.declarations,
      node.attributes,
      node.children
    ], { isRefChild: isRef })
  },

  _object: function(obj) {
    return this.mapObject(obj)
  }

})
