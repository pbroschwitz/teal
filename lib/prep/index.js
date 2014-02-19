var visitor = require('../visitor')
  , path = require('path')


module.exports = function(teal) {
  return new Prep(teal)
}

function Prep(teal) {
  this.teal = teal
  this.base = teal.opts.root
}

Prep.prototype.process = function(mods) {
  var self = this
  var classes = {}

  function shorten(s) {
    var cls = s.split('-')
    for (var i=1; i <= cls.length; i++) {
      s = cls.slice(-i).join('-')
      if (!(s in classes)) {
        classes[s] = true
        return s
      }
    }
  }

  function getClass(file) {
    return shorten(file.replace(self.base, '')
      .replace(/\//g, '-')
      .replace(/^-/, '')
      .replace(/\..+$/, '')
      .replace(/-index$/, '')
    )
}

  mods.forEach(function(ast) {
    var rootClass = getClass(ast.file)
    return visitor.visit(ast, function(on, visit) {

      on.root = function(node) {
        var el = node.root
        if (el) {
          el.prefix = el.class = rootClass
          el.selectors = ['.' + el.class]
          el.tags = tagCounts(el.children)
          visit(node.root.declarations)
        }
        return node
      }

      on.element = function(el) {
        el.tags = tagCounts(el.children)

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

      on._object = function(o) {
        Object.keys(o).forEach(function(key) {
          visit(o[key])
        })
      }
    })
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

function isAmbiguous(el) {
  if (el.class) return
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
  nodes.forEach(function(el, i) {
    var t = el.tag || '_'
    count[t] = (count[t]||0) + 1
    if (!styled[t]) styled[t] = el.styled
  })
  return {
    count: count,
    styled: styled
  }
}

/**
 * TODO move to util
 */
function grep(list, type) {
  return list.filter(function(node) { return node.type == type })
}

function insert(sel, item, index) {
  //TODO prefixes should be arrays that are .join('')'ed
  var a = sel.split(/([\s>]+)/)
  return a.slice(0, index).concat(item, a.slice(index)).join('')
}
