var Block = require('./block')

exports.range = require('ranged')
exports.dom = require('./domutils')
exports.merge = require('xtend')

exports.flatten = function flatten(list) {
  return list.reduce(function(acc, item) {
    if (Array.isArray(item)) return acc.concat(flatten(item))
    if (item instanceof Block) return acc.concat(flatten(item.children))
    return acc.concat(item)
  }, [])
}

exports.implicitAttrs = function(attrs, props, knownProps, runtime) {
  if (props && !props.noImplicitAtts) {
    var validate = runtime && runtime.isSupportedAttr || Boolean
    for (var p in props) {
      var v = props[p]
      if (!~knownProps.indexOf(p) && validate(p, v)) {
        attrs[p] = v
      }
    }
  }
  return attrs
}

exports.addState = function(className, scope, states) {
  var active = Object.keys(states)
    .filter(function(s) { return scope.get(s) })
    .map(function(s) { return states[s] })

  return exports.addClass(className, active.join(' '))
}

exports.addClass = function(cls, add) {
  var c = cls || ''
  return cls && add ? c + ' ' + add : c || add || ''
}

exports.get = function(obj, prop) {
  if (!obj) return
  return obj[prop]
}

/**
 * Invoke the iterator function for each item in the list and return the results.
 */
exports.each = function(list, as, index, scope, iterator) {
  if (!list) return
  if (list instanceof Block) list = list.children
  return list.map(function(item, i) {
    var s = {}
    s[as] = item
    if (index) s[index] = i
    return iterator(scope.sub(s))
  })
}

exports.block = function(props, children) {
  return new Block(props, children)
}

exports.fn = {

  length: function(obj) {
    if (obj instanceof Block) return obj.children.length
    return (obj||'').length
  },

  json: function(v) {
    return JSON.stringify(v)
  },

  uri: function(v) {
    return encodeURI(v)
  },

  uricomp: function(v) {
    return encodeURIComponent(v)
  }
}
