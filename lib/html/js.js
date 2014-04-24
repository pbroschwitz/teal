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
        f('var $=require("%s")(document,%j)', runtime, node.states),
        f('module.exports=exports=function(data){\n%s\n}', join(
          f('var scope=require("%s")(data)', __dirname + '/scope'),
          visit(node.variables),
          'return ' + root
        )),
        f('exports.params=%j', ['content'].concat(node.vars, node.states))
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

    on._object = function(o) {
      return object(Object.keys(o).map(function(k) {
        return { name: k, value: o[k] }
      }))
    }

    on._array = function(node) {
      return f('[%s]', node.map(visit))
    }

    on.element = function(node) {
      return f('$.el(%s,%j,scope,%s,%s)',
        visit(node.tag),
        node.class || '',
        visit(node.attributes),
        visit(node.content)
      )
    }

    on.fragment = function(node) {
      return f('[%s]', visit(node.content))
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
        params.push({ name: 'content', value: node.content.filter(Boolean) })
      }
      return f('$.ref(require(%j),scope,%s,%j)',
        node.path,
        object(params),
        node.class||''
      )
    }

    on.module = function(node) {
      return f('require("%s")(%s)', node.path, node.arguments.map(visit))
    }

    on.variable = function(node) {
      return f('scope.get(%j)', node.name)
    }

    on.function = function(node) {
      return f('_.%s(%s)', node.name, node.arguments.map(visit).join())
    }

    on.if = function(node) {
      var s = f('if(%s) { return %s }', visit(node.condition), visit(node.consequent))
      if (node.alternate) s += f('else { return %s }', visit(node.alternate))
      return iife(s)
    }

    on.for = function(node) {
      return f('_.each(%s, scope, function(scope) { return %s })',
        visit(node.expression), visit(node.body)
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
