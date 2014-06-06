var visitor = require('../visitor')
  , comb = require('../util/comb')
  , append = require('../util/append')
  , addTo = require('../util/addTo')

module.exports = function(ast, ctx) {

  function shorten(className) {
    var cls = ['teal'].concat(className.split('--'))
    for (var i=2; i <= cls.length; i++) {
      var s = cls.slice(-i).join('-')
      var ex = ctx.classes[s]
      if (ex == className) return s
      if (!ex) {
        ctx.classes[s] = className
        return s
      }
    }
  }

  function getClass(file) {
    return shorten(file.replace(ctx.root, '')
      .replace(/\//g, '--')
      .replace(/^--/, '')
      .replace(/\..+$/, '')
      .replace(/--index$/, '')
    )
  }

  var i = 1
  function syntheticClass(el) {
    return (el.tag || el.name) + '-' + i++
  }

  return visitor.visit(ast, {

    root: function(node) {
      var el = node.root
      if (el) {
        if (el.prefix) {
          // already processed
          throw new Error('already processed ' + node.file)
        }
        else {
          el.prefix = el.class = getClass(ctx.file)
          el.selectors = el.sel = ['.' + el.class]
          el.tags = tagCounts(el.children)
          this.visit(node.root.declarations)
        }
      }
      return node
    },

    element: function(el) {
      el.tags = tagCounts(el.children)
      if (isAmbiguous(el)) {
        el.class = syntheticClass(el)
      }

      el.sel = [el.class ? '.' + el.class : el.tag]
      el.selectors = combine(el.parent, el, ' > ')
      el.prefix = el.parent.prefix + '_' + (el.class || el.tag)
      this.visit(el.declarations)
    },

    fragment: function(node) {
      node.tags = tagCounts(node.children)
    },

    reference: function(el) {
      var cls = el.styled ? syntheticClass(el) : getClass(el.path)
      if (el.styled && isAmbiguous(el)) el.class = cls

      el.sel = ['.' + cls]
      el.selectors = combine(el.parent, el, ' > ')
      el.prefix = el.parent.prefix + '_'

      this.visit(el.declarations)
    },

    mixin: function(el) {
      el.prefix = ''
      this.visit(el.declarations)
    },

    style: function(node) {
      node.sel = node.selectors
      node.selectors = combine(node.parent, node)
      this.visit(node.declarations)
    },

    animation: function(node) {
      node.name = node.keyframes.name = node.parent.prefix.replace(/[\W-_]+/, '-')
      node.keyframes.position = node.position
    },

    _array: function(a) {
      a.forEach(this.visit, this)
    },

    _object: function(o) {
      Object.keys(o).forEach(function(key) {
        if (key != 'parent') this.visit(o[key])
      }, this)
    }
  })
}

function up(node, count) {
  for (var i=0; i < count; i++) {
    node = node.parent
  }
  return node
}

function prev(node, count) {
  var s = node.parent.children
  var i = s.indexOf(node)
  return s[i-count]
}

function combine(parent, child, combinator) {
  if (!parent) return child.sel
  var lastSel = child.parent.selectors

  var result = []
  var add = addTo(result)
  var prefixes
  var c

  child.sel.forEach(function(s) {
    if (s.parent) {
      prefixes = up(child, s.parent+1).selectors
      c = /^:/.test(s.selector) ? '' : ' '
      add(comb(append(prefixes, s.selector), unprefix(lastSel, prefixes), c))
    }
    else if (s.adjacentSibling) {
      prefixes = prev(child.parent, s.adjacentSibling).selectors
      c = /^:/.test(s.selector) ? '' : ' '
      add(comb(append(prefixes, s.selector + '~', c), child.parent.sel))
    }
    else if (s.state) {
      prefixes = findStatePrefixes(child, s.state)
      add(comb(append(prefixes, s.state, '.'), unprefix(lastSel, prefixes), ''))
    }
    else {
      add(append(lastSel, s, combinator))
    }
  })
  return result
}


function findStatePrefixes(node, state) {
  while ((node = node.parent)) {
    if (~node.states.indexOf(state)) return node.selectors
  }
}


function unprefix(a, prefixes) {
  return a.map(function(s) {
    for (var i = 0; i < prefixes.length; i++) {
      var p = prefixes[i]
      if (s.indexOf(p) === 0) {
        return s.substr(p.length)
      }
    }
    return s
  })
}

function isAmbiguous(el) {
  // If it has a class asume it's unique
  if (el.class) return

  // Ignore unstylable elements
  if ( /^(head|script|link)$/i.test(el.tag)) return

  // If the parent is a component we need a class as we don't know where the
  // element will lend up in the hierarchy
  if (el.parent.type == 'reference') return true

  var tags = el.parent.tags
  return tags.styled[el.tag || '_'] && (tags.count._ || tags.count[el.tag] > 1)
}

function tagCounts(nodes) {
  var count = { _: 0 }
  var styled = { }
  if (nodes) nodes.forEach(function(el, i) {
    var t = el.tag || '_'
    count[t] = (count[t]||0) + 1
    if (!styled[t]) styled[t] = el.styled
  })
  return {
    count: count,
    styled: styled
  }
}
