var xtend = require('xtend')

var addTo = require('../util/addTo')
var append = require('../util/append')
var comb = require('../util/comb')
var visitor = require('../visitor')

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

    emit: function() {
      var em = this.emitter
      if (em) em.emit.apply(em, arguments)
    },

    splice: function(sel, up) {
      var n = this.parent
      while (n.parent && up !== 0) {
        n = n.parent
        if (up) up--
      }
      var spliced = comb(n.selectors, sel)
      var suffixes = unprefix(this.parent.selectors, n.selectors)
      return comb(spliced, suffixes)
    },

    prev: function(i, sel) {
      // find the parent element
      var p = this.parent.parent
      while (!p.isElement) p = p.parent

      // look up the specified sibling
      var s = p.children
      var prev = s[s.length-i-1]

      var c = /^:/.test(sel) ? '' : ' '
      var sib = comb(prev.selectors, sel, c)

      return comb(sib, this.parent.selectors, i == 1? ' + ' : ' ~ ')
    },

    visitDescendants: function(node) {
      var i = this.rules.length

      var ctx = {
        parent: this.enter(node),
        declarations: []
      }

      this.visit(node.declarations, ctx)
      this.visit(node.attributes, ctx)
      this.visit(node.children, ctx)

      if (ctx.declarations.length) {
        this.rules.splice(i, 0, {
          type: 'rule',
          selectors: ctx.parent.selectors,
          declarations: ctx.declarations,
          position: node.position
        })
      }
    },

    enter: function(node) {
      var p = this.parent
      var n = {
        parent: p,
        level: p && p.level+1 || 1,
        children: []
      }
      if (node.type == 'element') {
        n.isElement = true
        n.selectors = this.expandSelectors(node)
        n.contentSelectors = node.contentSelectors
      }
      else {
        n.selectors = this.expandStyleSelectors(node)
      }
      if (p) p.children.push(n)
      this.emit('enter', n, this.ast)
      return n
    },

    expandSelectors: function(node) {
      var p = this.parent
      var current = p && p.selectors
      var local = node.class ? '.' + node.class : node.tag
      if (1 || !p) return [local]

      var c = ' > '

      if (p.contentSelectors) {
        c = p.contentSelectors[this.target || 'children'] || ''
        c += node.tag == 'body' ? ' ' : ' > '
      }

      return comb(p.selectors, local, c)
    },

    expandStyleSelectors: function(node) {
      var p = this.parent
      var current = p && p.selectors
      var sel = []
      node.selectors.forEach(function(s) {
        if (s.state) {
          var useChildSelectors = false //true
          if (useChildSelectors) {
            // add state class to the root element
            addTo(sel, this.splice('.' + s.class))
          }
          else {
            // add state class to the element itself
            addTo(sel, comb(current, s.class, '.'))
          }
        }
        else if (s.prefix !== undefined) {
          // .foo & { ... }
          // resolves to ".foo <lastSel>"
          addTo(sel, comb([s.prefix], current, ''))
        }
        else if (s.parent) {
          // parent selector: ^:foo { ... }
          var up = this.parent.level - s.parent
          if (up < 0) {
            // the specified level exceeds the node's depth
            // fill up with "* > ..."
            addTo(sel, comb('*' + s.selector + ' > ' + new Array(-up).join('* > '), current))
          }
          else {
            // lookup the specified selector(s) and splice local one
            addTo(sel, this.splice(s.selector, s.parent))
          }
        }
        else if (s.sibling) {
          // ~2:checked { ... }
          addTo(sel, this.prev(s.sibling, s.selector))
        }
        else if (s.adjacentSibling) {
          // +:checked { ... }
          addTo(sel, this.prev(1, s.adjacentSibling))
        }
        else if (s.child) {
          // > h1 { ... }
          addTo(sel, comb(current, s.child, ' > '))
        }
        else if (s.descendant) {
          // >> h1 { ... }
          addTo(sel, comb(current, s.descendant, ' '))
        }
        else if (s.dynamic) {
          var d = s.dynamic(current)
          if (d) addTo(sel, d)
        }
        else {
          var c
          if (/^:/.test(s)) c = '' // pseudo selector
          else if (/^body$/i.test(s)) c = ' ' // don't use child selector for html > body
          else c = ' > '
          addTo(sel, comb(current, s, c))
        }
      }, this)
      return sel
    }
  },

  root: function(ast) {
    if (ast.root && ast.root.type == 'mixin') return // skip mixins
    this.visit(ast.settings)
    this.visit(ast.root, { ast: ast })
  },

  const: function() {
    //skip @const
  },

  element: function(node) {
    this.visitDescendants(node)
  },

  style: function(node) {
    this.visitDescendants(node)
  },

  defaults: function(node) {
    this.visitDescendants(node, { rules: this.head })
  },

  declaration: function(node) {
    this.declarations.push(node)
  },

  function: function(node) {
    return node.name + '(' + node.args.join('') + ')'
  },

  animation: function(node) {
    node.name = node.keyframes.name = this.parent.selectors[0]
      .slice(1)
      .replace(/[^a-z0-9_]+/ig, ' ')
      .trim()
      .replace(/\s/g, '_')

    this.visit(node.keyframes)
    this.declarations.push({
      type: 'declaration',
      property: 'animation',
      value: node.name + ' ' + node.value,
      position: node.position
    })
  },

  keyframes: function(node) {
    this.head.unshift({
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
    this.head.unshift({
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
        var rule = {
          type: 'media',
          media: mq,
          position: node.position,
          rules: mediaRules
        }
        if (node.sheet) rule.sheet = node.sheet
        this.tail.push(rule)
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
    return this.visitObject(o)
  }

})

module.exports = function(asts, emitter) {
  var ctx = {
    head: [],
    rules: [],
    media: {},
    tail: [],
    emitter: emitter
  }
  asts.forEach(function(ast) {
    cssVisitor.visit(ast, ctx)
  })

  addTo(ctx.head, ctx.rules)
  addTo(ctx.head, ctx.tail)

  var rules = ctx.head
  return rules
}
