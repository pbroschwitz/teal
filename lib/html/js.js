var f = require('util').format
  , path = require('path')
  , pluck = require('plck')
  , uniqs = require('uniqs')
  , flatten = require('flatten')
  , visitor = require('../visitor')

module.exports = function(html) {

  return visitor({

    root: function(node) {
      this.visit(node.settings)
      var root = this.visit(node.root)
      var dt = node.doctype
      if (dt) {
        root = f('{doctype:%j, root:%s}', dt, root)
      }
      return join(
        f('var u=require("%s")', require.resolve('./util')),
        f('var s=require("%s")', require.resolve('../scope')),
        f('var d=require("%s")(document, u)', html.runtime),
        f('module.exports=exports=function(){\n%s\n}', join(
          'var scope=s(d.getData(arguments, this))',
          'return ' + root
        )),
        f('exports.params=%j', uniqs('children', node.vars, node.states))
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
      if (node.path) {
        var params = node.attributes ? node.attributes.slice() : []
        if (node.children) {
          params.push({ name: 'children', value: node.children })
        }
        return f('d.ref(require(%j),scope,%s,%j,%j)',
          node.path,
          object(params, this.visit.bind(this)),
          node.class||'',
          node.states
        )
      }
      return f('d.el(%s,%j,%j,scope,%s,%s)',
        this.visit(node.name),
        node.class || '',
        node.states,
        this.visit(node.attributes),
        this.visit(node.children)
      )
    },

    //block: function(node) {
    //  return this.visit(node.children)
    //},

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

    module: function(node) {
      return f('require("%s")(%s)',
        node.path,
        node.arguments.map(this.visit, this)
      )
    },

    variable: function(node) {
      return f('scope.get(%j)', node.name)
    },

    function: function(node) {
      var args = node.arguments.map(this.visit, this).join()
      if (node.name) return f('u.%s(%s)', node.name, args)
      else return f('require(%j)(%s)', node.path, args)
    },

    if: function(node) {
      var s = f('if(%s%s) { return %s }',
        node.not ? '!' : '',
        this.visit(node.condition),
        this.visit(node.consequent))

      if (node.alternate) {
        s += f('else { return %s }', this.visit(node.alternate))
      }
      return iife(s)
    },

    each: function(node) {
      return f('u.each(%s, %j, scope, function(scope) { return %s })',
        this.visit(node.expression),
        node.variable.name,
        this.visit(node.body)
      )
    },

    object: function(node) {
      return object(node.properties, this.visit.bind(this))
    },

    member: function(node) {
      return f('u.get(%s, %s)',
        this.visit(node.object),
        this.visit(node.property)
      )
    },

    call: function(node) {
      var args = node.arguments.map(this.visit, this).join()
      return f('%s(%s)', this.visit(node.callee), args)
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
  })
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
