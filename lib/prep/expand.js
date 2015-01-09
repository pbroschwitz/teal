var flatten = require('flatten')
var materialize = require('materialize')

var addToProp = require('../util/addToProp')
var helpers = require('./helpers')
var unquote = require('../util/unquote')
var visitor = require('../visitor')

module.exports = visitor({

  _context: helpers,

  mixin: function(node) {
    return this.params ? this.visit(node.content) : node
  },

  tokens: function(node) {
    return this.visit(node.tokens).join('')
  },

  value: function(node) {
    return this.evaluate ? this.visit(node.tokens).join('') : node
  },

  call: function(node) {
    if (typeof node.callee != 'string') return node
    var m = this.macros[node.callee]
    if (!m) return this.mapObject(node)
    var res = m.apply(this, this.visit(node.arguments, { evaluate: true }))
    return this.visit(res)
  },

  function: function(node) {
    var arg = this.visit(node.arg)
    var m = this.functions[node.name]
    //REVISIT pass quoted args ... this.sub({ rawArgs: args })
    if (m) return this.visit(m.call(this, unquote(arg)))
    return node.name + '(' + arg + ')'
  },

  block: function(node) {
    node.props = toProps(splitContent(this.visit(node.content)))
    return this.evaluate ? node.props : node
  },

  element: function(node) {
    var s
    if (node.mixin) {
      var mx = node.mixin.content

      node = this.mapObject(node)
      s = splitContent(node.content)
      var params = toStyle(s.decl)
      return this.visit(mx, { params: params })
    }

    node = this.mapObject(node)
    s = splitContent(node.content)

    addToProp(node, 'attributes', s.attr)
    addToProp(node, 'children', s.children)
    addToProp(node, 'declarations', s.decl)
    delete node.content
    return node
  },

  _object: function(node) {
    return this.mapObject(node)
  }
})


function splitContent(content) {
  var s = {
    attr: [],
    children: [],
    decl: []
  }
  if (content) content.forEach(function split(n) {
    if (Array.isArray(n)) n.forEach(split)
    else if (n.type == 'attribute') s.attr.push(n)
    else if (isCssNode(n)) s.decl.push(n)
    else s.children.push(n)
  })
  return s
}

function toStyle(decl) {
  var s = {}
  decl.forEach(function(d) {
    s[d.property] = d.value
  })
  return s
}

function toProps(s) {
  var p = {}
  var children = []
  s.attr.forEach(function(a) {
    p[a.name] = a.value
  })
  if (s.children.length) {
    p.children = p.children ? p.children.concat(s.children) : s.children
  }
  return p
}

function isCssNode(n) {
  return n.type == 'declaration'
    || n.type == 'style'
    || n.type == 'animation'
    || n.type == 'keyframes'
    || n.type == 'media'
    || n.type == 'sheet'
}
