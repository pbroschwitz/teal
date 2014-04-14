var f = require('util').format
  , path = require('path')

module.exports = function(html, runtime) {

  return function(on, visit) {

    var states

    on.root = function(node) {
      var root = visit(node.root)
      var dt = node.doctype
      if (dt) {
        root = f('{doctype:%j, root:%s}', dt, root)
      }
      return join(
        f('var _=require("%s")', __dirname + '/util'),
        f('var $=require("%s")(document)', runtime),
        f('module.exports=function(data){\n%s\n}', join(
          f('var scope=require("%s")(data)', __dirname + '/scope'),
          f('var states=%j', node.states),
          visit(node.variables),
          'return ' + root
        ))
      )
    }

    on._string = function(s) {
      return JSON.stringify(s)
    }

    on._boolean = function(value) {
      return JSON.stringify(value)
    }

    on._number = function(s) {
      return JSON.stringify(s)
    }

    on.array = function(node) {
      return f('[%s]', visit(node.items))
    }

    on.element = function(node) {
      var el = f('$.el(%s,%s,[%s],[%s])',
        visit(node.tag),
        JSON.stringify(node.class),
        visit(node.attributes),
        visit(node.content)
      )
      return f('$.setState(%s, scope, states)', el)
    }

    on.fragment = function(node) {
      return f('$.fragment([%s])', visit(node.content))
    }

    on.comment = function(node) {
      return '$.comment(' + visit(node.text) + ')'
    }

    on.attribute = function(node) {
      return f('{name:%j,value:%s}', node.name, visit(node.value))
    }

    on.reference = function(node) {
      var params = node.params.slice()

      if (node.content.length) {
        params.push({ name: 'content', value: { type: 'array', items: node.content }})
      }

      var el = f('require("%s")(scope.fresh(%s))', node.path, object(params))
      var cls = visit(node.class)
      var attrs = visit(node.attributes)
      return f('$.decorate(%s,%s,[%s])', el, cls, attrs)
    }

    on.module = function(node) {
      return f('require("%s")(%s)', node.path, node.arguments.map(visit))
    }

    on.variable = function(node) {
      return f('scope.get(%j)', node.name)
    }

    on.function = function(node) {
      return f('_.%s(%s)', node.name, visit(node.arguments).join())
    }

    on.if = function(node) {
      var s = f('if(%s) { return %s }', visit(node.condition), visit(node.consequent.content))
      if (node.alternate) s += f('else { return %s }', visit(node.alternate.content))
      return iife(s)
    }

    on.for = function(node) {
      return f('_.each(%s, scope, function(scope) { return %s })',
        visit(node.expression), visit(node.body.content)
      )
    }

    on.assignment = function(node) {
      return f('scope.set(%j, %s)', node.variable, visit(node.value))
    }

    on.object = function(node) {
      return object(node.properties)
    }

    on.member = function(node) {
      return node.computed
        ? f('%s[%s]', visit(node.object), visit(node.property))
        : f('%s.%s', visit(node.object), node.property)
    }

    on.group = function(node) {
      return '(' + visit(node.expression) + ')'
    }

    on.ternary = function(node) {
      return visit(node.expression)
        + '?' + visit(node.truthy)
        + ':' + visit(node.falsy)
    }

    on.binary = function(node) {
      var op = node.op
      if (op == '|') op = '||'
      return visit(node.left) + op + visit(node.right)
    }

    on.unary = function(node) {
      return node.op + visit(node.expression)
    }

    function object(props) {
      if (!props) return '{}'
      props = props.map(function(p) {
        return f('"%s":%s', p.name, visit(p.value))
      })
      return f('{%s}', props)
    }

  }
}

function iife(/* ... */) {
  return f('(function(){%s}())', join.apply(this, arguments))
}


function join() {
  return Array.prototype.concat.apply([], arguments).filter(Boolean).join(';\n')
}
