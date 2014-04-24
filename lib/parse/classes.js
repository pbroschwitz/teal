var visitor = require('../visitor')
  , list = require('../list')

module.exports = function(ast, ctx) {

function shorten(className) {
    var cls = className.split('--')
    for (var i=1; i <= cls.length; i++) {
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


  return visitor.visit(ast, function(on, visit) {

    on.root = function(node) {
      var el = node.root
      if (el) {
        if (el.prefix) {
          // already processed
          throw new Error('already processed')
          ctx.classes[el.class] = true
        }
        else {
          el.lib = ctx.lib
          el.prefix = el.class = getClass(ctx.file)
          el.selectors = ['.' + el.class]
          el.selectorTree = [el.selectors]
          el.tags = tagCounts(el.children)
          visit(node.root.declarations)
        }
      }
      return node
    }

    on.element = function(el) {
      el.tags = tagCounts(el.children)
      el.lib = ctx.lib

      if (isAmbiguous(el)) {
        el.class = syntheticClass(el)
      }

      if (el.class) {
        el.class = el.parent.prefix + '_' + el.class
        el.selectors = ['.' + el.class]
        el.prefix = el.class
      }
      else {
        el.selectors = combine(el.parent.selectorTree, [el.tag], ' > ')
        el.prefix = el.parent.prefix + '_' + el.tag
      }
      el.selectorTree = el.parent ? el.parent.selectorTree.slice() : []
      el.selectorTree.push(el.selectors)
      visit(el.declarations)
    }

    on.fragment = function(node) {
      node.tags = tagCounts(node.children)
    }

    on.reference = function(el) {

      if (el.styled) {
        el.class = el.parent.prefix + '_' + syntheticClass(el)
        el.selectors = ['.' + el.class]
        el.prefix = el.class
      }
      else {
        var cls = getClass(el.path)
        el.selectors = combine(el.parent.selectorTree, ['.' + cls], ' > ')
        el.prefix = el.parent.prefix + '_' + cls
      }
      el.selectorTree = el.parent ? el.parent.selectorTree.slice() : []
      el.selectorTree.push(el.selectors)

      visit(el.declarations)
    }

    on.style = function(node) {
      node.selectors = combine(node.parent.selectorTree, node.selectors)
      node.selectorTree = node.parent ? node.parent.selectorTree.slice() : []
      node.selectorTree.push(node.selectors)
      visit(node.declarations)
    }

    on.animation = function(node) {
      node.name = node.parent.prefix.replace(/[\W-_]+/, '-')
    }

    on._array = function(a) {
      a.forEach(visit)
    }

    on._object = function(o) {
      Object.keys(o).forEach(function(key) {
        if (key != 'parent') visit(o[key])
      })
    }
  })
}


function combine(tree, selectors, combinator) {
  if (!tree) return selectors
  var last = tree.length-1
  var result = []
  var add = list.addTo(result)
  selectors.forEach(function(s) {
    if (s.parent) {
      var prefixes = tree[last-s.parent]
      add(combine([append(prefixes, s.selector)], unprefix(tree[last], prefixes), ' '))
    }
    else {
      add(append(tree[last], s, combinator))
    }
  })
  return result
}

var unstyled = /^(head|script|link)$/i

function append(a, s, combinator) {
  return a.map(function(i) { return i + (combinator||'') + s })
}

function unprefix(a, prefixes) {
  return a.map(function(s) {
    for (var i = 0; i < prefixes.length; i++) {
      var p = prefixes[i]
      if (s.indexOf(p) === 0) {
        var t = s.substr(p.length)
        if (!t.match(/^[\w_]/)) return t.trim()
      }
    }
    return s
  })
}

function isAmbiguous(el) {
  if (el.class || unstyled.test(el.tag)) return
  if (el.parent.type == 'reference') return true
  var tags = el.parent.tags
  return tags.styled[el.tag || '_'] && (tags.count._ || tags.count[el.tag] > 1)
}

function syntheticClass(el) {
  var i = el.parent.children.indexOf(el)
  return (el.tag || el.name) + (i ? i+1 : '')
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

function insert(sel, item, index) {
  var a = sel.split(/([\s>:]+)/)
    , i = index * 2
  return a.slice(0, i).concat(item, a.slice(i)).join('')
}
