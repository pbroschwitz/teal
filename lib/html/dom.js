var f = require('util').format

module.exports = function(on, visit) {
  on.root = function(node) {
    return join(
      f('var runtime=require("%s")', __dirname + '/runtime'),
      f('module.exports=function(data){%s}', join(
        visit(node.variables),
        'return ' + visit(node.root)
      ))
    )
  }

  on._string = function(s) {
    return JSON.stringify(s)
  }

  on._boolean = function(value) {
    return JSON.stringify(value)
  }

  on.array = function(node) {
    return JSON.stringify(node.items)
  }

  on.element = function(node) {
    var js = [f('var el=document.createElement(%s)', visit(node.tag))]
    if (node.class) js.push(f('el.className="%s"', node.class))

    return f('(function(){%s}())', join(
        js,
        visit(node.declarations),
        'return el'
      ))
  }

  on.fragment = function(node) {
    return f('(function(){%s}())', join(
      'var el=document.createDocumentFragment()',
      visit(node.content),
      'return el'
    ))
  }

  on.comment = function(node) {
    return 'document.createComment(' + visit(node.text) + ')'
  }

  on.attribute = function(node) {
    return f('el.setAttribute(%s,%s)', visit(node.name), visit(node.value))
  }

  on.content = function(node) {
    return f('runtime.append(el,%s)', visit(node.content))
  }

  on.reference = function(node) {

    var params = node.params.map(function(d) {
      return f('"%s":%s', d.name, visit(d.value))
    })

    if (node.content.length) {
      params.push(f('content:[].concat(%s)', visit(node.content)))
    }

    params = f('{%s}', params)
    if (!node.parent) params = f('runtime.merge(%s, data)', params)

    var el = f('require("%s")(%s)', node.path, params)
    if (node.class) el = f('runtime.addClass(%s,"%s")', el, node.class)
    return el
  }

  on.module = function(node) {
    return f('require("%s")(%s)', node.path, node.arguments.map(visit))
  }

  on.var = function(node) {
    return node.name ? 'data["' + node.name + '"]' : 'data'
  }

  on.function = function(node) {
    return f('runtime.%s(%s)', node.name, visit(node.arguments).join())
  }

  on.style = function(node) {
    return node.states.map(function(s) {
      var val = visit({ type: 'var', name: s })
      return f('runtime.addClass(el,"%s",%s)', s, val)
    })
  }

  on.if = function(node) {
    var s = f('if(%s) { %s }', visit(node.condition), visit(node.then))
    if (node.else) s+= f('else { %s }', visit(node.else))
    return s
  }

  on.each = function(node) {
    return f('runtime.each(%s, function(data){ %s })',
      visit(node.expression), visit(node.body)
    )
  }

  on.assignment = function(node) {
    return f('data.%s = %s', node.variable, visit(node.value))
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

function join() {
  return Array.prototype.concat.apply([], arguments)
    .filter(function(s) { return s.length })
    .join(';')
}
