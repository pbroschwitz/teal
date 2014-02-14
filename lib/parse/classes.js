var visitor = require('../visitor')
  , path = require('path')

module.exports = function(rootClass, ast) {

  return visitor(function(on, visit) {

    function select(el) {
      return el.class ? '.' + el.class : el.tag
    }


    on.root = function(node) {
      var el = node.root
      if (el) {
        el.prefix = el.class = rootClass
        el.selectors = ['.' + el.class]
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

    //on.attribute = function(node) {
    //  node.prefix = node.parent.prefix + '_' + node.name
    //  node.selectors = node.parent.selectors
    //  visit(node.value)
    //}

    on.style = function(node) {
      node.selectors = combine(node.parent.selectors, node.selectors)
      visit(node.declarations)
    }

    on._object = function(o) {
      Object.keys(o).forEach(function(key) {
        visit(o[key])
      })
    }
  })(ast)
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
  var tags = el.parent.tags || {}
  return tags._ || tags[el.tag] > 1
}

function syntheticClass(el) {
  var i = el.parent.children.indexOf(el)
  return (el.tag || el.name) + (i ? i+1 : '')
}

function tagCounts(nodes) {
  var count = { _: 0 }
  nodes.forEach(function(el, i) {
    var t = el.tag || '_'
    count[t] = (count[t]||0) + 1
  })
  return count
}

/**
 * TODO move to util
 */
function grep(list, type) {
  return list.filter(function(node) { return node.type == type })
}

function insert(sel, item, index) {
  var a = sel.split(/([\s>]+)/)
  return a.slice(0, index).concat(item, a.slice(index)).join('')
}
