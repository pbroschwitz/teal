var visitor = require('../visitor')
  , fs = require('fs')
  , path = require('path')

/**
 * Tree visitor that:
 *   - sets up parent/child references
 *   - resolves dependencies
 *   - checks whether an element is styled
 *   - detects modifier classes
 *   - populates $content
 */
module.exports = function(ast, opts) {

  ast.file = opts.file
  var base = opts.teal.opts.root
  var dir = path.dirname(ast.file)

  return visitor.visit(ast, function(on, visit) {

    var root
      , parent
      , ctx

    function visitChildren(el) {
      el.children = []
      el.parent = parent
      if (parent) parent.children.push(el)
      parent = el
      visit(el.declarations || el.value)
      parent = el.parent
    }

    function dep(p, index) {
      var f = (p[0] == '/')
        ? base + p
        : path.resolve(dir, p)

      if (index) f += '/index'
      f += '.tl'
      if (!fs.existsSync(f)) {
        if (index) throw Error(index + ' does not exist')
        return dep(p, f)
      }
      if (!~root.deps.indexOf(f)) root.deps.push(f)
      return f
    }

    on.root = function(node) {
      root = node
      parent = undefined
      node.file = ast.file
      visit(node.root)
      return node
    }

    on.element = function(node) {
      node.styled = grep(node.declarations, 'declaration').length
      visitChildren(node)
    }

    on.fragment = function(node) {
      visitChildren(node)
    }

    on.reference = function(node) {
      node.name = path.basename(node.path)
      node.path = dep(node.path)
      visitChildren(node)
      var decl = node.declarations
      node.styled = grep(decl, 'declaration').length
      node.params = grep(decl, 'attribute')
      node.content = pluck(grep(decl, 'content'), 'content')
    }

    on.style = function(node) {
      node.states = node.selectors
        .filter(function(s) { return s[0] == '.' })
        .map(function(s) { return s.slice(1) })

      node.parent = parent
      parent = node
      visit(node.declarations)
      parent = node.parent
    }

    on.animation = function(node) {
      node.parent = parent
    }

    on._object = function(o) {
      Object.keys(o).forEach(function(key) {
        visit(o[key])
      })
    }
  })
}

/**
 * Filter the list of nodes by the given type.
 */
function grep(list, type) {
  return list.filter(function(node) { return node.type == type })
}

/**
 * Extract a property from a list of nodes.
 */
function pluck(list, prop) {
  return list.map(function(node) { return node[prop] })
}
