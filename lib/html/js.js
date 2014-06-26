var f = require('util').format
  , path = require('path')
  , pluck = require('plck')
  , uniqs = require('uniqs')

module.exports = function(html) {

  return {

    root: function(node) {
      var vars = this.vars
      var scope = {}
      if (node.root) {
        // if this module has a root element create a sub-scope
        // otherwise @defaults are set in the global scope
        scope.vars = vars = vars.sub()
      }

      this.visit(node.settings, scope)

      var params = uniqs('content', node.vars, node.states)
      var defaults = vars.pick(params)


      var root = this.visit(node.root, scope)

      var dt = node.doctype
      if (dt) {
        root = f('{doctype:%j, root:%s}', dt, root)
      }

      return join(
        f('var u=require("%s")', __dirname + '/util'),
        f('var d=require("%s")(document, u)', html.runtime),
        f('module.exports=exports=function(data){\n%s\n}', join(
          f('var scope=u.scope(arguments, this, %j)', defaults),
          'return ' + root
        )),
        f('exports.params=%j', params)
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

    defaults: function(d) {
      this.vars.defaults(d.template)
    },

    element: function(node) {
      return f('d.el(%s,%j,%j,scope,%s,%s)',
        this.visit(node.tag),
        node.class || '',
        node.states,
        this.visit(node.attributes),
        this.visit(node.content)
      )
    },

    fragment: function(node) {
      return f('[%s]', this.visit(node.content))
    },

    comment: function(node) {
      return 'd.comment(' + this.visit(node.text) + ')'
    },

    attribute: function(node) {
      return f('{name:%j,value:%s}', node.name, this.visit(node.value))
    },

    reference: function(node) {
      var params = node.params.slice()
      if (node.content.length) {
        params.push({ name: 'content', value: {
          type: 'function',
          name: 'flatten',
          arguments: [node.content.filter(Boolean)]
        }})
      }
      return f('d.ref(require(%j),scope,%s,%j,%j)',
        node.path,
        object(params, this.visit.bind(this)),
        node.class||'',
        node.states
      )
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
      if (node.name) {
        var fn = html.functions[node.name]
        if (fn) return this.visit(fn.apply(this.ctx, node.arguments))
      }

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
      return node.computed
        ? f('%s[%s]', this.visit(node.object), this.visit(node.property))
        : f('%s.%s', this.visit(node.object), node.property)
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
