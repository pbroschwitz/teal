var flatten = require('flatten')
  , pluck = require('plck')
  , materialize = require('materialize')
  , visitor = require('../visitor')

module.exports = visitor({

  root: function(ast) {
    ast.vars = []
    ast = this.mapObject(ast, { root: ast })
    if (ast.root) {
      // Add implicit $children
      var isElement = ast.root.type == 'element'
      var $children = ~ast.vars.indexOf('children')

      if (isElement && !$children) {
        ast.vars.push('children')
        if (!ast.root.children) ast.root.children = []
        ast.root.children.push({ type: 'variable', name: 'children' })
      }
    }
    return ast
  },

  mixin: function(node) {
    // skip mixins
    return node
  },

  function: function(node) {
    if (node.name) {
      var fn = this.teal.macros[node.name]
      var args = this.visit(node.arguments, { eval: !!fn })
      if (fn) return this.visit(fn.apply(this, args))
    }
    return this.mapObject(node)
  },

  value: function(node) {
    if (!this.eval) return this.mapObject(node)
    return this.visit(node.tokens).join('')
  },

  string: function(node) {
    return node.value
  },

  binary: function(node) {
    if (!this.eval) return this.mapObject(node)
    if (node.op == '+') return this.visit(node.left) + this.visit(node.right)
  },

  member: function(node) {
    if (!this.eval) return this.mapObject(node)
    var obj = this.visit(node.object)
    var prop = node.computed ? this.visit(node.property) : node.property
    return obj && obj[prop]
  },

  call: function(node) {
    if (!this.eval) return this.mapObject(node)
    var callee = this.visit(node.callee)
    var args = this.visit(node.arguments)
    //TODO Check if macro exists
    return this.mapObject(node)
    //return callee.apply(this, args)
  },

  const: function(node) {
    if (node.declarations) node.declarations.forEach(function(d) {
      var val = this.visit(d.value, { eval: true })
      this.vars.setDefault(d.name, val)
    }, this)
    if (node.attributes) node.attributes.forEach(function(d) {
      var val = this.visit(d.value, { eval: true })
      this.vars.setDefault(d.name, val)
    }, this)
    return node
  },

  element: function(node) {
    node = this.mapObject(node)
    if (node.name.path) {
      node.path = this.resolve(node.name.path)
    }
    return node
  },

  block: function(node) {
    if (node.attributes) node.props = materialize(node.attributes)
    return this.mapObject(node)
  },

  //reference: function(node) {
  //  if (node.mixin) {
  //    var vars = this.vars.sub()
  //    this.visit(node.declarations, { vars: vars, set: true })
  //    vars.set('children', this.visit(pluckContent(node), { eval: true }))
  //    return this.visit(node.mixin, { vars: vars })
  //  }
  //  node = this.mapObject(node)
  //  node.params = collect('attribute', node)
  //  if (!node.children) {
  //    // children might have already been set by a macro
  //    node.children = pluckContent(node)
  //  }
  //  return node
  //},

  media: function(node) {
    node = this.mapObject(node)
    if (Array.isArray(node.media)) {
      node.media = flatten(this.visit(node.media, { eval: true })).join('').trim()
    }
    return node
  },

  declaration: function(node) {
    if (this.set) {
      this.vars.set(node.property, this.visit(node.value))
      return
    }
    return this.mapObject(node, { eval: true })
  },

  variable: function(node) {
    var val = this.vars.get(node.name) //|| this.ctx.teal.statics[node.name]

    if (val !== undefined) return val // this is a const
    else if (this.eval) throw new Error('Undefined $' + node.name)

    // runtime variable ...
    this.root.vars.push(node.name)
    return node
  },

  _object: function(o) {
    return this.mapObject(o)
  }

})
