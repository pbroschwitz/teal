var visitor = require('../visitor')
  , path = require('path')

module.exports = function(teal, file, ast) {

  var dir = path.dirname(file)

  return visitor(function(on, visit) {

    var root
      , parent
      , rootClass

    function visitChildren(el) {
      el.children = []
      el.parent = parent
      if (parent) parent.children.push(el)
      parent = el
      visit(el.declarations)
      parent = el.parent
    }

    function dep(p) {
      p += '.tl'
      if (p[0] == '/') p = teal.opts.root + p
      else p = path.resolve(dir, p)
      root.deps.push(p)
      return p
    }

    on.root = function(node) {
      root = node
      parent = undefined
      node.deps = []
      node.file = file
      rootClass = node.root.class = teal.getClassName(file)
      visit(node.root)
      return node
    }

    on.element = function(el) {
      visitChildren(el)
      var tags = { _: 0 }

      el.children.forEach(function(child, i) {
        var t = child.tag || '_'
        tags[t] = (tags[t]||0) + 1
      })
      el.children.forEach(function(child, i) {
        if (Math.max(tags[child.tag], tags._) > 1 && !child.class) {
          child.class = 'el' + i
        }
        if (child.class) child.class = rootClass + '--' + child.class
      })
    }

    on.reference = function(ref) {
      ref.path = dep(ref.path)
      visitChildren(ref)
      var decl = ref.declarations
      ref.params = grep(decl, 'attribute'),
      ref.content = pluck(grep(decl, 'content'), 'content')
    }

    on.parameter = function(node) {
      node.value.class = rootClass + '-' + node.name
      visit(node.value)
    }

    on._object = function(o) {
      Object.keys(o).forEach(function(key) {
        visit(o[key])
      })
    }
  })(ast)
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
