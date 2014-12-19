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
      var c = el.class || el.tag
      if (!c || c == '*') c = 'e'
      if (!this.count[c]) this.count[c] = 0
      return '_' + c + '_' + (++this.count[c])
    },

    isAmbiguous: function(el) {
      // ignore root nodes
      if (!this.parent) return

      // ignore unstyleable elements
      if ( /^(head|script|link)$/i.test(el.tag)) return

        // if it has a class asume it's unique
      //if (el.class) return

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
    ast.selectors = {}
    this.visit(ast.root, { ast: ast, count: {}, contentSelector: '' })
    return ast
  },

  variable: function(node) {
    this.ast.selectors[node.name] = this.contentSelector
  },

  element: function(node) {
    if (node.mixin) return
    if (node == this.ast.root) {
      node.class = this.getClass(this.ast.file)
    }
    else if (node.styled) {
      if (this.isAmbiguous(node)) {
        node.class = this.syntheticClass(node)
      }
    }

    var sel = node.class ? '.' + node.class : node.name
    var c = node.name == 'body' ? ' ' : ' > '

    var ctx = {
      parent: node,
      contentSelector: this.parent ? this.contentSelector + c + sel : ''
    }

    this.visit(node.declarations, ctx)
    this.visit(node.attributes, ctx)
    this.visit(node.children, ctx)
  },

  style: function(style) {
    // collect all states ...
    var sel = style.selectors.filter(function(s) { return s.state })
    if (sel.length) {
      var states = []
      var useChildSelectors = true
      var el = useChildSelectors ? this.ast.root : this.parent
      if (!el.states) el.states = {}
      sel.forEach(function(s) {
        s.class = s.state
        states.push(s.state)
        el.states[s.state] = s.class
      })

      // ... and add them to the root
      addUnique(this.ast.states, states)
    }
    this.visit(style.declarations)
  },

  _object: function(obj) {
    this.visitObject(obj)
  }

})
