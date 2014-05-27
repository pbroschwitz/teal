var visitor = require('../visitor')
  , list = require('../list')
  , comb = list.cartesian
  , append = list.append

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
          el.selectors = ['.' + el.class]
          el.selectorTree = selectorTree(el)
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

      //if (/^_/.test(el.class)) el.class = el.parent.prefix + el.class

      //if (el.class) {
      //  el.class = el.parent.prefix + '_' + el.class
      //  el.selectors = ['.' + el.class]
      //  el.prefix = el.class
      //}
      //else {
      //  el.selectors = combine(el.parent.selectorTree, [el.tag], ' > ')
      //  el.prefix = el.parent.prefix + '_' + el.tag
      //}
      var sel = el.class ? '.' + el.class : el.tag
      el.selectors = comb(el.parent.selectors, sel, ' > ')
      el.prefix = el.parent.prefix + '_' + (el.class || el.tag)
      el.selectorTree = selectorTree(el)
      this.visit(el.declarations)
    },

    fragment: function(node) {
      node.tags = tagCounts(node.children)
    },

    reference: function(el) {
      var cls = el.styled ? syntheticClass(el) : getClass(el.path)
      if (el.styled && isAmbiguous(el)) el.class = cls

      el.selectors = comb(el.parent.selectors, '.' + cls, ' > ')
      el.prefix = el.parent.prefix + '_' + cls
      el.selectorTree = selectorTree(el)

      this.visit(el.declarations)
    },

    mixin: function(el) {
      el.prefix = ''
      el.selectorTree = []
      this.visit(el.declarations)
    },

    style: function(node) {
      node.selectors = combine(node.parent.selectorTree, node.selectors)
      node.selectorTree = selectorTree(node)
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

function selectorTree(node) {
  var p = node.parent
  var tree = p && p.selectorTree ? p.selectorTree.slice() : []
  tree.push({ selectors: node.selectors, states: node.states || [] })
  return tree
}


function combine(tree, selectors, combinator) {
  if (!tree) return selectors
  var last = tree.length-1
  var lastSel = tree[last].selectors
  var result = []
  var add = list.addTo(result)
  var prefixes
  var c
  selectors.forEach(function(s) {
    if (s.parent) {
      prefixes = tree[last-s.parent].selectors
      c = /^:/.test(s.selector) ? '' : ' '
      add(comb(append(prefixes, s.selector), unprefix(lastSel, prefixes), c))
    }
    else if (s.state) {
      prefixes = findStatePrefixes(tree, s.state)
      add(comb(append(prefixes, s.state, '.'), unprefix(lastSel, prefixes), ''))
    }
    else {
      add(append(lastSel, s, combinator))
    }
  })
  return result
}


function findStatePrefixes(tree, state) {
  for (var i=0; i < tree.length; i++) {
    var s = tree[i]
    if (~s.states.indexOf(state)) return s.selectors
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

var i = 1
function syntheticClass(el) {
  //var i = el.parent.children.indexOf(el)
  //return (el.tag || el.name) + (i ? i+1 : '')
  return (el.tag || el.name) + '-' + i++
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
