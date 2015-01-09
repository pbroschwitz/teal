var addToProp = require('../util/addToProp')
var visitor = require('../visitor')

/**
 *
 */
module.exports = visitor({

    root: function(ast) {
      ast.vars = []
      ast.states = []
      this.visitObject(ast, { ast: ast })
      if (ast.root) {
        // Add implicit $children
        var isElement = ast.root.type == 'element'
        var $children = ~ast.vars.indexOf('children')

        if (isElement && !$children) {
          ast.vars.push('children')
          addToProp(ast.root, 'children',
            { type: 'variable', name: 'children' }
          )
        }
      }
      return ast
    },

    element: function(node) {
      this.visitObject(node, { parent: node })
    },

    style: function(style) {
      // collect all states ...
      var sel = style.selectors.filter(function(s) { return s.state })
      if (sel.length) {
        var states = []
        var useChildSelectors = true
        var el = this.parent
        if (!el.states) el.states = {}
        sel.forEach(function(s) {
          s.class = s.state // TODO make this pluggable
          states.push(s.state)
          el.states[s.state] = s.class
        })
        // ... and add them to the root
        addToProp(this.ast, 'states', states)
      }
      this.visit(style.declarations)
    },

    //declaration: function(node) {
    //  // mark the parent element as being styled
    //  if (this.parent) this.parent.styled = true
    //  this.visit(node.value)
    //},

    variable: function(node) {
      addToProp(this.ast, 'vars', node.name)
    },

    _object: function(obj) {
      return this.visitObject(obj)
    }

})
