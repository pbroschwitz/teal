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
      return ctx.process(f).file
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
        node.root.content.push({ type: 'variable', name: 'content' })
      }
      return node
    }

    on.element = function(node) {
      var decl = node.declarations
      node.styled = grep(decl, 'declaration').length
      node.states = []
      visitChildren(node)
      node.attributes = grep(decl, 'attribute')
      node.content = pluck(grep(decl, 'content'), 'content')
    }

    on.fragment = function(node) {
      visitChildren(node)
      var decl = node.declarations
      node.content = pluck(grep(decl, 'content'), 'content')
    }

    on.reference = function(node) {
      var decl = node.declarations
      node.name = path.basename(node.path)
      node.path = dep(node.path)
      node.styled = grep(decl, 'declaration').length
      node.states = []
      visitChildren(node)
      node.params = grep(decl, 'attribute')
      node.content = pluck(grep(decl, 'content'), 'content')
    }

    on.style = function(node) {
      node.parent = parent

      node.states = node.selectors
        .map(function(s) { return s.state }).filter(Boolean)

      list.addUnique(parentElement(node).states, node.states)
      list.addUnique(root.states, node.states)

      parent = node
      visit(node.declarations)
      parent = node.parent
    }

    on.media = function(node) {
      node.parent = parent
      visit(node.declarations)
      parent = node.parent
    }

    on.animation = function(node) {
      node.parent = parent
    }

    on.variable = function(node) {
      if (node.name == 'content') root.hasContent = true
      else root.vars.push(node.name)
    }

    on._array = function(a) {
      return a.forEach(visit)
    }

    on._object = function(o) {
      Object.keys(o).forEach(function(key) {
        visit(o[key])
      })
    }
  })
}

function parentElement(node) {
  if (node.type == 'element' || node.type == 'reference') return node
  return parentElement(node.parent)
}
