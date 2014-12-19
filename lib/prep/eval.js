var flatten = require('flatten')
var materialize = require('materialize')

var addContent = require('../parse/helpers').addContent
var addToProp = require('../util/addToProp')
var visitor = require('../visitor')

module.exports = visitor({

  _context: {
    visitChildren: function(node) {

      // reference to @mixin
      if (node.mixin) {
        var vars = this.vars.sub()

        // evaluate attributes and set them as vars
        this.visit(node.attributes, { vars: vars, set: true })

        // expose nested nodes as $children
        vars.set('children', this.visit(node.children, { evaluate: true }))

        // finally evaluate the actual mixin content
        var mx = this.visit(node.mixin, { vars: vars })

        // collect attributes/declarations in the context
        addToProp(this.mixins, 'attributes', mx.attributes)
        addToProp(this.mixins, 'declarations', mx.declarations)

        // and replace the node with the children to be mixed in
        return mx.children
      }

      // collect attributes/declarations/children to mix in
      var m = {}
      node = this.mapObject(node, { mixins: m })
      addToProp(node, 'attributes', m.attributes)
      addToProp(node, 'declarations', m.declarations)

      // flatten (and filter) the chilren returned by any mixins
      if (node.children) {
        node.children = flatten(node.children.filter(Boolean))
      }

      return node
    },

    /** utility method for macros that need to create elements */
    el: function(name, attrs) {
      if (~name.indexOf('/')) name = { type: 'path', path: this.resolve(name) }
      var children = attrs.children || Array.prototype.slice.call(arguments, 2)
      delete attrs.children
      return {
        type: 'element',
        name: name,
        attributes: Object.keys(attrs).map(function(n) {
          return { type: 'attribute', name: n, value: attrs[n] }
        }),
        children: children
      }
    },

    /** utility method for macros that need to generate multiple values */
    values: function(values) {
      return { type: 'values', values: values }
    }
  },

  root: function(ast) {
    ast.vars = []
    ast = this.mapObject(ast, { ast: ast })
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
    return this.mixins ? this.mapObject(node) : node
  },

  value: function(node) {
    if (!this.evaluate) return this.mapObject(node)
    return this.visit(node.tokens).join('')
  },

  declaration: function(node) {
    var d = this.mapObject(node, { evaluate: true })
    d.value = d.value.join('').trim()
    return d
  },

  member: function(node) {
    if (!this.evaluate) return this.mapObject(node)
    var obj = this.visit(node.object)
    var prop = node.computed ? this.visit(node.property) : node.property
    return obj && obj[prop]
  },

  function: function(node) {
    var args = this.visit(node.args).join('')
    var m = this.teal.css.functions[node.name]
    if (m) return m.call(this, args)
    return node.name + '(' + args + ')'
  },

  call: function(node) {
    var callee = node.callee.path || this.visit(node.callee)
    var m = this.teal.macros[callee]
    if (m) return m.apply(this, this.visit(node.arguments))
    return this.mapObject(node)
  },

  const: function(node) {
    if (node.declarations) node.declarations.forEach(function(d) {
      var val = this.visit(d.value, { evaluate: true })
      this.vars.setDefault(d.property, val)
    }, this)
    if (node.attributes) node.attributes.forEach(function(d) {
      var val = this.visit(d.value, { evaluate: true })
      this.vars.setDefault(d.name, val)
    }, this)
    return node
  },

  style: function(node) {
    return this.visitChildren(node)
  },

  element: function(node) {
    return this.visitChildren(node)
  },

  block: function(node) {
    if (node.attributes) node.props = materialize(node.attributes)
    return this.mapObject(node)
  },

  media: function(node) {
    node = this.mapObject(node)
    if (Array.isArray(node.media)) {
      node.media = flatten(this.visit(node.media, { evaluate: true })).join('').trim()
    }
    return node
  },

  attribute: function(node) {
    if (this.set) {
      this.vars.set(node.name, this.visit(node.value))
      return
    }
    return this.mapObject(node)
  },

  variable: function(node) {
    var val = this.vars.get(node.name) //|| this.ctx.teal.statics[node.name]
    if (val !== undefined) return val // this is a const
    else if (this.evaluate) throw new Error('Undefined $' + node.name)

    // runtime variable ...
    addToProp(this.ast, 'vars', node.name)
    return node
  },

  _object: function(o) {
    return this.mapObject(o)
  }

})
