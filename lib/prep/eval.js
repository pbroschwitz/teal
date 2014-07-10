var flatten = require('flatten')
  , pluck = require('plck')
  , matching = require('matching')

module.exports = {

  root: function(ast) {
    ast.vars = []
    ast = this.mapObject(ast, { root: ast })
    if (ast.root) {
      // Add implicit $content
      var hasContent = ast.root.content
      var $content = ~ast.vars.indexOf('content')

      if (hasContent && !$content) {
        ast.vars.push('content')
        ast.root.content.push({ type: 'variable', name: 'content' })
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
      var fn = this.ctx.teal.macros[node.name]
      var args = this.visit(node.arguments, { eval: true })
      if (fn) return this.visit(fn.apply(this.ctx, args))
    }
    return this.mapObject(node)
  },

  value: function(node) {
    if (!this.eval) return this.mapObject(node)
    return this.visit(node.tokens).join('')
  },

  binary: function(node) {
    if (!this.eval) return this.mapObject(node)
    if (node.op == '+') return this.visit(node.left) + this.visit(node.right)
  },

  const: function(node) {
    node.declarations.forEach(function(d) {
      this.vars.default(d.property, this.visit(d.value))
    }, this)
    return node
  },

  element: function(node) {
    node = this.mapObject(node)
    node.attributes = collect('attribute', node)
    node.content = pluckContent(node)
    return node
  },

  reference: function(node) {
    if (node.mixin) {
      var vars = this.vars.sub()
      this.visit(node.declarations, { vars: vars, set: true })
      return { type: 'include', declarations: this.visit(node.mixin, { vars: vars }) }
    }
    node = this.mapObject(node)
    node.params = collect('attribute', node)
    node.content = pluckContent(node)
    return node
  },

  fragment: function(node) {
    node.content = pluckContent(node)
    return node
  },

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
    if (this.eval) {
      var val = this.vars.get(node.name)
      if (!val) throw new Error('Undefined $' + node.name)
      return val
    }
    this.root.vars.push(node.name)
    return node
  },

  _object: function(o) {
    return this.mapObject(o)
  }
}

function collect(type, node) {
  return matching({ type: type }, node.declarations)
}

function pluckContent(node) {
  return (node.declarations||[]).filter(function(n) {
    return !n.type || /element|reference|comment|if|each|member|variable|group|function/.test(n.type)
  })
}
