var visitor = require('../visitor')
  , path = require('path')

module.exports = function(ast, opts) {
  ast.file = opts.file
  var base = opts.teal.opts.root
  var dir = path.dirname(ast.file)

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
      p += '.tl'
      if (p[0] == '/') p = base + p
      else p = path.resolve(dir, p)
      root.deps.push(p)
      return p
    }

    on.root = function(node) {
      root = node
      parent = undefined
      node.deps = []
      node.file = ast.file
      visit(node.root)
      return node
    }

    on.element = function(node) {
      node.styled = grep(node.declarations, 'property').length
      visitChildren(node)
    }

    on.reference = function(node) {
      node.name = path.basename(node.path)
      node.path = dep(node.path)
      visitChildren(node)
      var decl = node.declarations
      node.styled = grep(decl, 'property').length
      node.params = grep(decl, 'attribute')
      node.content = pluck(grep(decl, 'content'), 'content')
    }

    //on.attribute = function(node) {
    //  visitChildren(node)
    //}

    on.style = function(node) {
      node.states = node.selectors
        .filter(function(s) { return s[0] == '.' })
        .map(function(s) { return s.slice(1) })

      node.parent = parent
      parent = node
      visit(node.declarations)
      parent = node.parent
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
