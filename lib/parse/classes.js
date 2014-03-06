var visitor = require('../visitor')
  , grep = require('../list').grep

module.exports = function(ast, ctx) {

function shorten(s) {
    var cls = s.split('-')
    for (var i=1; i <= cls.length; i++) {
      s = cls.slice(-i).join('-')
      if (!(s in ctx.classes)) {
        ctx.classes[s] = true
        return s
      }
    }
  }

  function getClass(file) {
    return shorten(file.replace(ctx.root, '')
      .replace(/\//g, '-')
      .replace(/^-/, '')
      .replace(/\..+$/, '')
      .replace(/-index$/, '')
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
        el.selectors = combine(el.parent.selectors, [' > ' + el.tag])
        el.prefix = el.parent.prefix + '_' + el.tag
      }
      visit(el.declarations)
    }

    on.reference = function(ref) {
      ref.prefix = ref.parent.prefix + '_' + syntheticClass(ref)
      if (ref.styled) {
        ref.class = ref.prefix
        ref.selectors = ['.' + ref.class]
      }
      visit(ref.declarations)
    }

    on.style = function(node) {
      node.selectors = combine(node.parent.selectors, node.selectors)
      visit(node.declarations)
    }

    on.animation = function(node) {
      node.name = node.parent.prefix.replace(/[\W-_]+/, '-')
    }

    on._object = function(o) {
      Object.keys(o).forEach(function(key) {
        visit(o[key])
      })
    }
  })
}


function combine(prefixes, selectors) {
  if (!prefixes) return selectors
  var result = []
  selectors.forEach(function(s) {
    result.push.apply(result, prefixes.map(function(p) {
      if (s.parent) return insert(p, s.selector, -s.parent)
      return p + s
    }))
  })
  return result
}

var unstyled = /^(head|script|link)$/i

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
