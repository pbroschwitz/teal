var visitor = require('../visitor')
  , fs = require('fs')
  , path = require('path')
  , pluck = require('plck')
  , grep = require('../util/grep')
  , addUnique = require('../util/addUnique')

/**
 * Tree visitor that:
 *   - sets up parent/child references
 *   - resolves dependencies
 *   - checks whether an element is styled
 *   - detects state classes
 *   - populates $content
 */
module.exports = function(ast, ctx) {

  function dep(p) {
    var f = ctx.resolve(p)
    if (!fs.existsSync(f)) throw new Error(f + ' does not exist')
    var ast = ctx.parse(f)
    return ast.file
  }


  var v = visitor({
    root: function(node) {
      node.file = ast.file
      node.vars = []
      node.cssVars = []
      node.states = []
      this.visit(node.settings, { root: node })
      this.visit(node.root, { root: node })

      // Add implicit $content
      if (node.root.content && !~node.vars.indexOf('content')) {
        node.vars.push('content')
        node.root.content.push({ type: 'variable', name: 'content' })
      }

      return node
    },

    element: function(node) {
      var decl = node.declarations
      node.styled = grep(decl, 'declaration').length
      node.states = []
      this.visit(node.tag)
      this.visitChildren(node)
      node.attributes = grep(decl, 'attribute')
      node.content = pluck('content', grep(decl, 'content'))
    },

    fragment: function(node) {
      this.visitChildren(node)
      var decl = node.declarations
      node.content = pluck('content', grep(decl, 'content'))
    },

    mixin: function(node) {
      // do nothing ...
    },

    include: function(node) {
      var f = ctx.resolve(node.path)
      if (!fs.existsSync(f)) throw new Error(f + ' does not exist')
      var ast = ctx.parse(f)
      node.ast = JSON.parse(JSON.stringify(ast.root.declarations))
      this.visit(node.ast)
    },

    reference: function(node) {
      var decl = node.declarations
      node.name = path.basename(node.path)
      node.path = dep(node.path)
      node.styled = grep(decl, 'declaration').length
      node.states = []
      this.visitChildren(node)
      node.params = grep(decl, 'attribute')
      node.content = pluck('content', grep(decl, 'content'))
    },

    style: function(node) {
      node.parent = this.parent //REVISIT

      node.states = node.selectors
        .map(function(s) { return s.state }).filter(Boolean)

      addUnique(parentElement(node).states, node.states)
      addUnique(this.root.states, node.states)
      this.visit(node.declarations, { parent: node })
    },

    media: function(node) {
      node.parent = this.parent
      this.visit(node.declarations)
    },

    animation: function(node) {
      node.parent = this.parent //REVISIT
    },

    variable: function(node) {
      var decl = this.currentDeclaration
      if (decl) {
        decl.parameterized = true
        this.root.cssVars.push(node.name)
      }
      else {
        this.root.vars.push(node.name)
      }
    },

    declaration: function(node) {
      this.visit(node.value, { currentDeclaration: node })
    },

    _array: function(a) {
      return a.forEach(this.visit, this)
    },

    _object: function(o) {
      Object.keys(o).forEach(function(key) {
        this.visit(o[key])
      }, this)
    }
  })

  return v.visit(ast, {
    visitChildren: function(el) {
      el.children = []
      el.parent = this.parent
      if (this.parent) this.parent.children.push(el)
      this.visit(el.declarations || el.value, { parent: el })
    }
  })

}

function parentElement(node) {
  if (node.type == 'element' || node.type == 'reference' || node.type == 'mixin') return node
  return parentElement(node.parent)
}
