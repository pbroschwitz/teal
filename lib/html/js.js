var f = require('util').format
  , path = require('path')

module.exports = function(html) {

  return {

    root: function(node) {
      var root = this.visit(node.root)

      var dt = node.doctype
      if (dt) {
        root = f('{doctype:%j, root:%s}', dt, root)
      }

      return join(
        f('var _=require("%s")', __dirname + '/util'),
        f('var $=require("%s")(document, _)', html.runtime),
        f('module.exports=exports=function(data){\n%s\n}', join(
          f('var scope=_.scope(arguments, this, %j)', node.varDefaults),
          'return ' + root
        )),
        f('exports.params=%j', ['content'].concat(node.vars, node.states))
      )
    },

    _string: function(s) {
      return JSON.stringify(s)
    },

    _boolean: function(value) {
      return JSON.stringify(value)
    },

    _number: function(s) {
      return JSON.stringify(s)
    },

    _object: function(o) {
      return object(Object.keys(o).map(function(k) {
        return { name: k, value: o[k] }
      }), this.visit.bind(this))
    },

    _array: function(node) {
      return f('[%s]', node.map(this.visit, this))
    },

    element: function(node) {
      return f('$.el(%s,%j,%j,scope,%s,%s)',
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
      return '$.comment(' + this.visit(node.text) + ')'
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
      return f('$.ref(require(%j),scope,%s,%j,%j)',
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
      return f('_.%s(%s)',
        node.name,
        node.arguments.map(this.visit, this).join()
      )
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
      return f('_.each(%s, %j, scope, function(scope) { return %s })',
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
