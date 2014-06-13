var addUnique = require('../util/addUnique')
  , findup = require('findup-sync')
  , fs = require('fs')
  , path = require('path')
  , pluck = require('plck')
  , matching = require('matching')
  , materialize = require('materialize')
  , visitor = require('../visitor')

module.exports = function(ast, ctx) {

  function dep(p) {
    var f = ctx.resolve(p)
    if (!fs.existsSync(f)) throw new Error(f + ' does not exist')
    return {
      file: f,
      ast: path.extname(f) == '.tl' && ctx.parse(f)
    }
  }


  var v = visitor({
    root: function(ast) {

      ast.vars = []    // variables used throughout the template
      ast.cssVars = [] // variables used throughout the css
      ast.states = []  // list of all defined states names

      this.visit(ast.settings)

      if (ast.root) {
        this.visit(ast.root)

        // Add implicit $content
        var hasContent = ast.root.content
        var $content = ~ast.vars.indexOf('content')

        if (hasContent && !$content) {
          ast.vars.push('content')
          ast.root.content.push({ type: 'variable', name: 'content' })
        }
      }

      return ast
    },

    defaults: function(d) {
      d.css = materialize(collect('declaration', d), 'property')
      d.template = materialize(collect('attribute', d))
    },

    element: function(node) {
      // visit tag to detect vars
      this.visit(node.tag)

      node.states = []

      this.visitChildren(node, node.declarations)
      node.attributes = collect('attribute', node)
      node.content = collectContent(node)

      this.countTag(node)
    },

    fragment: function(node) {
      var decl = node.declarations
      this.visitChildren(node, decl)
      node.content = collectContent(node)
    },

    reference: function(node) {
      node.name = path.basename(node.path)
      node.path = dep(node.path).file
      node.states = []

      this.visitChildren(node, node.declarations)
      node.params = collect('attribute', node)
      node.content = collectContent(node)
      this.countTag(node)
    },

    style: function(style) {
      // collect all states ...
      style.states = pluck('state', style.selectors).filter(Boolean)

      // ... and add them to the parent node
      addUnique(this.parent.states, style.states)

      // ... as well as to the root node
      addUnique(ast.states, style.states)

      this.visit(style.declarations)
    },

    declaration: function(node) {
      if (this._parent) this._parent.styled = true
      this.visit(node.value, { currentDeclaration: node })
    },

    variable: function(node) {
      var decl = this.currentDeclaration
      if (decl) {
        // this is a css variable
        decl.parameter = node.name // TODO support multiple vars in one decl
        ast.cssVars.push(node.name)
      }
      else {
        // template variable
        ast.vars.push(node.name)
      }
    },

    _object: function(obj) {
      this.visitProps(obj)
    }
  })

  return v.visit(ast, {
    countTag: function(node) {
      if (!this._parent) return

      var t = this._parent.tags
      if (!t) t = this._parent.tags = {}

      var n = node.tag || '*'
      if (!t.count) t.count = {}
      var c = t.count[n] || 0
      t.count[n] = c + 1

      if (!t.styled) t.styled = {}
      if (node.styled) t.styled[n] = true
    }
  })

}

function collect(type, node) {
  return matching({ type: type }, node.declarations)
}

function collectContent(node) {
  return pluck('content', collect('content', node))
}
