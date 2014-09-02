var xtend = require('xtend')
var visitor = require('../visitor')
var addTo = require('../util/addTo')
var append = require('../util/append')
var comb = require('../util/comb')

function unprefix(a, prefixes) {
  return a.map(function(s) {
    for (var i = 0; i < prefixes.length; i++) {
      var p = prefixes[i]
      if (s.indexOf(p) === 0) {
        return s.substr(p.length)
      }
    }
    return s
  })
}

var cssVisitor = visitor({

  _context: {

    findAncestorWithState: function(state) {
      var n = this.parent
      while (n) {
        if (~n.states.indexOf(state)) return n
        n = n.parent
      }
    },

    visitDeclarations: function(node, ctx) {
      var i = this.rules.length // remember the insertion point for new rules

      var info = xtend(node, {
        localSelectors: this.selectLocal(node),
        selectors: this.select(node)
      })

      var decl = []
      ctx = xtend({ declarations: decl }, ctx)
      this.visitChildren(info, node.declarations, ctx)

      // insert declarations at the previously remembered index
      if (decl.length) {

        this.rules.splice(i, 0, {
          type: 'rule',
          selectors: info.selectors,
          declarations: decl,
          position: node.position
        })
      }
    },

    selectLocal: function(node) {
      if (node.selectors) return node.selectors
      if (node.class) return ['.' + node.class]
      if (node.tag) return [node.tag]
      return [] // TODO what about dynamic tags?
    },

    select: function (child) {

      if (!this.parent || child.absolute) {
        // top-level element
        return this.selectLocal(child)
      }

      var lastSel = this.parent.selectors
      var result = []
      var prefixes
      var c

      // resolve local selectors
      this.selectLocal(child).forEach(function(s) {

        if (s.parent === 0) {
          // unspecific parent selector: ^.foo { ... }
          // resolves to ".foo <lastSel>"
          addTo(result, comb([s.selector], lastSel, ' '))
        }
        else if (s.parent) {
          // specific parent selector: ^1:foo { ... }
          var up = this.parent.level() - s.parent
          if (up < 0) {
            // the specified level exceeds the node's depth
            // fill up with "* > ..."
            addTo(result, comb(['*' + s.selector + ' > ' + new Array(-up).join('* > ')], lastSel))
          }
          else {
            // lookup the specified selector(s) and splice local one
            prefixes = this.parent.up(s.parent).selectors
            addTo(result, comb(append(prefixes, s.selector), unprefix(lastSel, prefixes)))
          }
        }
        else if (s.adjacentSibling) {
          // ~2:checked { ... }
          prefixes = this.parent.prev(s.adjacentSibling).selectors
          c = /^:/.test(s.selector) ? '' : ' '
          addTo(result, comb(append(prefixes, s.selector + '~', c), this.parent.localSelectors))
        }
        else if (s.state) {
          // find the selectors of the top-most ancestor that shares the given state

          prefixes = this.stateSelectors(s.state) || lastSel
          addTo(result, comb(append(prefixes, s.state, '.'), unprefix(lastSel, prefixes), ''))
        }
        else {
          if (child.type == 'reference' && this.parent.type == child.type) addTo(result, [s])
          else {
            if (/^:/.test(s)) c = '' // pseudo selector
            else if (/^body$/i.test(s)) c = ' ' // don't use child selector for html > body
            else c = ' > '
            addTo(result, append(lastSel, s, c))
          }
        }
      }, this)

      return result
    }
  },

  root: function(ast) {
    if (ast.root && ast.root.type == 'mixin') return // skip mixins
    this.visit(ast.settings)
    this.visit(ast.root)
  },

  const: function() {
    //skip @const
  },

  function: function(node) {
    return node.name + '(' + node.arguments + ')'
  },

  element: function(node) {
    this.visitDeclarations(node)
  },

  style: function(node) {
    this.visitDeclarations(node)
  },

  declaration: function(node) {
    var value = this.visit(node.value).join('').trim()
    this.declarations.push({
      type: 'declaration',
      property: node.name,
      //parameter: node.parameter,
      value: value,
      position: node.position
    })
  },

  animation: function(node) {

    node.name = node.keyframes.name = this.parent.selectors[0]
      .slice(1)
      .replace(/[^a-z0-9_-]+/ig, '_')

    this.visit(node.keyframes)
    this.declarations.push({
      type: 'declaration',
      property: 'animation',
      value: node.name + ' ' + node.value,
      position: node.position
    })
  },

  keyframes: function(node) {
    this.rules.unshift({
      type: 'keyframes',
      name: node.name,
      position: node.position,
      keyframes: this.visit(node.frames),
    })
  },

  keyframe: function(node) {
    var decl = []
    this.visit(node.declarations, { declarations: decl })
    return {
      type: 'keyframe',
      values: node.values,
      declarations: decl
    }
  },

  font: function(node) {
    var decl = []
    this.visit(node.declarations, { declarations: decl })
    this.rules.unshift({
      type: 'rule',
      selectors: ['@font-face'],
      declarations: decl,
      position: node.position
    })
  },

  media: function(node) {
    var mq = node.media
    var rules = []
    var decl = []

    this.visit(node.declarations, {
      rules: rules,
      declarations: decl
    })

    if (decl.length) {
      rules.splice(0, 0, {
        type: 'rule',
        selectors: this.parent.selectors,
        declarations: decl,
        position: node.position
      })
    }

    if (rules.length) {
      var mediaRules = this.media[mq]
      if (!mediaRules) {
        mediaRules = this.media[mq] = []
        this.tail.push({
          type: 'media',
          media: mq,
          sheet: node.sheet,
          position: node.position,
          rules: mediaRules
        })
      }
      addTo(mediaRules, rules)
    }
  },

  sheet: function(node) {
    var decl = []
    this.visit(node.declarations, { declarations: decl })
    this.tail.push({
      type: 'sheet',
      name: node.name,
      declarations: decl
    })
  },

  _object: function(o) {
    return this.mapObject(o)
  }

})

module.exports = function(asts) {
  var ctx = {
    rules: [],
    media: {},
    tail: []
  }
  asts.forEach(function(ast) {
    cssVisitor.visit(ast, ctx)
  })

  addTo(ctx.rules, ctx.tail)

  return ctx.rules
}
