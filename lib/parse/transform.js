var visitor = require('../visitor')
  , fs = require('fs')
  , path = require('path')
  , pluck = require('plck')
  , matching = require('matching')
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
    return {
      file: f,
      ast: path.extname(f) == '.tl' && ctx.parse(f)
    }
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
      node.styled = matching({ type: 'declaration' }, decl).length
      node.states = []
      this.visit(node.tag)
      this.visitChildren(node)
      node.attributes = matching({ type: 'attribute' }, decl)
      node.content = pluck('content', matching({ type: 'content' }, decl))
    },

    fragment: function(node) {
      this.visitChildren(node)
      var decl = node.declarations
      node.content = pluck('content', matching({ type: 'content' }, decl))
    },

    reference: function(node) {
      var decl = node.declarations
      node.name = path.basename(node.path)
      node.path = dep(node.path).file
      node.styled = matching({ type: 'declaration' }, decl).length
      node.states = []
      this.visitChildren(node)
      node.params = matching({ type: 'attribute' }, decl)
      node.content = pluck('content', matching({ type: 'content' }, decl))
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
        decl.parameter = node.name
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
      this.visit(el.declarations || el.value, {
        parent: isElement(el) ? el : this.parent
      })
    }
  })

}

function isElement(node) {
  return node.type == 'element' || node.type == 'reference' || !node.parent
}

function parentElement(node) {
  return isElement(node) ? node : parentElement(node.parent)
}
