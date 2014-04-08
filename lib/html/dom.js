var f = require('util').format
  , path = require('path')

module.exports = function(html) {

  return function(on, visit) {

    var states

    on.root = function(node) {
      var root = visit(node.root)
      var dt = node.doctype
      if (dt) {
        root = f('runtime.prop(%s, "__doctype", %s)', root, JSON.stringify(dt))
      }
      return join(
        f('var runtime=require("%s")', __dirname + '/runtime'),
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
      return JSON.stringify(node.items)
    }

    on.element = function(node) {
      var el = f('runtime.el(document,%s,%s,[%s],[%s])',
        visit(node.tag),
        JSON.stringify(node.class),
        visit(node.attributes),
        visit(node.content)
      )
      return f('runtime.setState(%s, scope, states)', el)
    }

    on.fragment = function(node) {
      return iife(
        'var el=document.createDocumentFragment()',
        f('runtime.append(el, [%s])', visit(node.content)),
        'return el'
      )
    }

    on.comment = function(node) {
      return 'document.createComment(' + visit(node.text) + ')'
    }

    on.attribute = function(node) {
      return f('{name:%j,value:%s}', node.name, visit(node.value))
    }

    on.reference = function(node) {

      var params = node.params.map(function(d) {
        return f('"%s":%s', d.name, visit(d.value))
      })

      if (node.content.length) {
        params.push(f('content:[].concat(%s)', visit(node.content)))
      }

      params = f('{%s}', params)
      //if (!node.parent) params = f('runtime.merge(%s, data)', params)

      var el = f('require("%s")(scope.fresh(%s))', node.path, params)
      var cls = visit(node.class)
      var attrs = visit(node.attributes)
      return f('runtime.decorate(%s,%s,[%s])', el, cls, attrs)
    }

    on.module = function(node) {
      return f('require("%s")(%s)', node.path, node.arguments.map(visit))
    }

    on.var = function(node) {
      return f('scope.get(%j)', node.name)
    }

    on.function = function(node) {
      return f('runtime.%s(%s)', node.name, visit(node.arguments).join())
    }

    on.if = function(node) {
      var s = f('if(%s) { return %s }', visit(node.condition), visit(node.then.content))
      if (node.else) s += f('else { return %s }', visit(node.else.content))
      return iife(s)
    }

    on.for = function(node) {
      return f('runtime.each(%s, scope, function(scope) { return %s })',
        visit(node.expression), visit(node.body.content)
      )
    }

    on.assignment = function(node) {
      return f('scope.set(%j, %s)', node.variable, visit(node.value))
    }

    on.not = function(node) {
      return '!' + visit(node.expression)
    }

    on.neg = function(node) {
      return '-' + visit(node.value)
    }

    on.group = function(node) {
      return '(' + visit(node.expression) + ')'
    }

    on.ternary = function(node) {
      return visit(node.expression)
        + '?' + visit(node.truthy)
        + ':' + visit(node.falsy)
    }

    on.default = function(node) {
      return visit(node.expression) + '||' + visit(node.default)
    }

    "|| && == != <= >= < > + - * / %".split(' ').forEach(function(op) {
      on[op] = function(node) {
        return visit(node.left) + op + visit(node.right)
      }
    })
  }
}

function iife(/* ... */) {
  return f('(function(){%s}())', join.apply(this, arguments))
}

function join() {
  return Array.prototype.concat.apply([], arguments).filter(Boolean).join(';\n')
}
