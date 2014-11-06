var f = require('util').format
var path = require('path')
var util = require('./util')

var flatten = require('flatten')
var uniqs = require('uniqs')

module.exports = {

  root: function(node) {
    this.visit(node.settings)

    var root = this.visit(node.root, { ast: node })
    var runtime = this.runtime || require.resolve('./runtime')

    var dt = node.doctype
    if (dt) {
      root = f('{doctype:%j, root:%s}', dt, root)
    }

    return join(
      f('var u=require("%s")', require.resolve('./util')),
      f('var s=require("%s")', require.resolve('../../scope')),
      f('var d=require("%s")(document, u)', runtime),
      f('module.exports=d.component(function(props){\n%s\n}, %j)', join(
        'var scope=s.apply(null, arguments)',
        'return ' + root
      ), node.file)
    )
  },

  _string: function(s) {
    return JSON.stringify(s)
  },

  _boolean: function(value) {
    return JSON.stringify(value)
  },

  _number: function(value) {
    return JSON.stringify(value)
  },

  _object: function(o) {
    if (Array.isArray(o)) {
      return f('[%s]', o.map(this.visit, this))
    }
    return object(Object.keys(o).map(function(k) {
      return { name: k, value: o[k] }
    }), this.visit.bind(this))
  },

  value: function(node) {
    return f('%s.join("")', this.visit(node.tokens))
  },

  element: function(node) {
    var ast = this.ast
    var attrs = object(node.attributes, this.visit.bind(this))
    var className = this.visit(node.class || '')

    if (node == ast.root) {
      if (!node.path) {
        var known = uniqs(ast.vars, ast.states)
        attrs = f('u.implicitAttrs(%s, props, %j, d)', attrs, known)
      }
    }

    if (node.states) {
      className = f('u.addState(%s, scope, %j)', className, node.states)
    }

    return f('d.%s(%s,%s,%s,%s)',
      node.path ? 'ref' : 'el',
      node.path ? f('require(%j)', node.path) : this.visit(node.name),
      attrs,
      className,
      this.visit(node.children || [])
    )
  },

  comment: function(node) {
    return 'd.comment(' + this.visit(node.text) + ')'
  },

  html: function(node) {
    return 'd.html(' + this.visit(node.html) + ')'
  },

  serialize: function(node) {
    return 'd.serialize(' + this.visit(node.content) + ')'
  },

  attribute: function(node) {
    return f('{name:%j,value:%s}', node.name, this.visit(node.value))
  },

  variable: function(node) {
    return f('scope.get(%j)', node.name)
  },

  if: function(node) {
    var s = f('if(%s) { return %s }',
      this.visit(node.condition),
      this.visit(node.consequent))

    if (node.alternate) {
      s += f('else { return %s }', this.visit(node.alternate))
    }
    return iife(s)
  },

  each: function(node) {
    return f('u.each(%s, %j, %j, scope, function(scope) { return %s })',
      this.visit(node.expression),
      node.variable,
      node.index,
      this.visit(node.body)
    )
  },

  range: function(node) {
    return f('u.range(%s, %s)',
      this.visit(node.start),
      this.visit(node.end)
    )
  },

  block: function(node) {
    var props = node.attributes || []
    return f('u.block(%s,%s)',
      object(props, this.visit.bind(this)),
      this.visit(node.children)
    )
  },

  member: function(node) {
    return f('u.get(%s, %s)',
      this.visit(node.object),
      this.visit(node.property)
    )
  },

  path: function(node) {
    return f('require(%j)', node.path)
  },

  call: function(node) {
    var c = node.callee

    if (c.path) c = f('require(%j)', c.path)
    else if (typeof c != 'string') c = this.visit(c)
    else if (util.fn[c]) c = 'u.fn.' + c
    else if (this.resolve(c)) c = f('require(%j)', c)

    var args = node.arguments.map(this.visit, this).join()
    return f('%s(%s)', c, args)
  },

  group: function(node) {
    return '(' + this.visit(node.expression) + ')'
  },

  ternary: function(node) {
    return this.visit(node.expression)
      + '?' + this.visit(node.truthy)
      + ':' + this.visit(node.falsy)
  },

  binary: function(node) {
    var op = node.op
    return this.visit(node.left) + op + this.visit(node.right)
  },

  unary: function(node) {
    return node.op + this.visit(node.expression)
  }
}


// Code generation helpers

function object(props, visit) {
  if (!props) return '{}'
  props = props.map(function(p) {
    return f('"%s":%s', p.name, visit(p.value))
  })
  return f('{%s}', props)
}

function iife(/* ... */) {
  return f('(function(){%s}())', join.apply(this, arguments))
}


function join() {
  return Array.prototype.concat.apply([], arguments).filter(Boolean).join(';\n')
}
