var visitor = require('../visitor')
  , fs = require('fs')
  , path = require('path')
  , list = require('../list')
  , pluck = list.pluck
  , grep = list.grep

/**
 * Tree visitor that:
 *   - sets up parent/child references
 *   - resolves dependencies
 *   - checks whether an element is styled
 *   - detects state classes
 *   - populates $content
 */
module.exports = function(ast, ctx) {

  return visitor.visit(ast, function(on, visit) {

    var root
      , parent

    function visitChildren(el) {
      el.children = []
      el.parent = parent
      if (parent) parent.children.push(el)
      parent = el
      visit(el.declarations || el.value)
      parent = el.parent
    }

    function dep(p) {
      var f = ctx.resolve(p)
      if (!fs.existsSync(f)) throw new Error(f + ' does not exist')
      return ctx.process(f)
    }

    on.root = function(node) {
      root = node
      parent = undefined
      node.file = ast.file
      node.vars = []
      node.states = []
      visit(node.variables)
      visit(node.root)
      if (!root.hasContent) {
        node.root.content.push({ type: 'var', name: 'content' })
      }
      return node
    }

    on.element = function(node) {
      var decl = node.declarations
      node.styled = grep(decl, 'declaration').length
      visitChildren(node)
      node.attributes = grep(decl, 'attribute')
      node.content = pluck(grep(decl, 'content'), 'content')
      node.states = list.flatten(pluck(grep(decl, 'style'), 'states'))
    }

    on.fragment = function(node) {
      visitChildren(node)
      var decl = node.declarations
      node.content = pluck(grep(decl, 'content'), 'content')
    }

    on.reference = function(node) {
      node.name = path.basename(node.path)

      var ast = dep(node.path)
      node.path = ast.file

      visitChildren(node)
      var decl = node.declarations
      node.styled = grep(decl, 'declaration').length
      node.params = grep(decl, 'attribute')
      node.content = pluck(grep(decl, 'content'), 'content')

      // set params that aren't declared by the element as attributes
      node.attributes = node.params.filter(function(a) {
        return !~ast.vars.indexOf(a.name) && !~ast.states.indexOf(a.name)
      })
    }

    on.style = function(node) {
      node.states = node.selectors
        .filter(function(s) { return s[0] == '.' })
        .map(function(s) { return s.slice(1) })

      list.addUnique(root.states, node.states)
      node.parent = parent
      parent = node
      visit(node.declarations)
      parent = node.parent
    }

    on.animation = function(node) {
      node.parent = parent
    }

    on.var = function(node) {
      if (node.name == 'content') root.hasContent = true
      else root.vars.push(node.name)
    }

    on._object = function(o) {
      Object.keys(o).forEach(function(key) {
        visit(o[key])
      })
    }
  })
}
