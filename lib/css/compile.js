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

function local(a, b) {
  function common() {
    for (var i=0; i < a.length; i++) {
      if (a[i] !== b[i]) return i
    }
    return a.length
  }
  return a.slice(common())
}


var cssVisitor = visitor({

  _context: {

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

      // strip the common selector part
      var rel = local(this.parent.selectors[0], prev.selectors[0])

      var c = /^:/.test(sel) ? '' : ' '
      var sib = comb(prev.selectors, sel, c)

      return comb(sib, rel, i == 1? ' + ' : ' ~ ')
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
      return n
    },

    expandSelectors: function(node) {
      var p = this.parent
      var current = p && p.selectors
      var local = ''
      if (p) {
        local = ' > '
        if (p.contentSelectors) {
          local += p.contentSelectors[this.target || 'children'] || ''
        }
      }

      local += node.class ? '.' + node.class : node.tag
      return comb(p && p.selectors, local)
    },

    expandStyleSelectors: function(node) {
      var p = this.parent
      var current = p && p.selectors
      var sel = []
      node.selectors.forEach(function(s) {
        if (s.state) {
          addTo(sel, this.splice('.' + s.state))
        }
        else if (s.parent === 0) {
          // unspecific parent selector: ^.foo { ... }
          // resolves to ".foo <lastSel>"
          addTo(sel, comb([s.selector], current, ' '))
        }
        else if (s.parent) {
          // specific parent selector: ^1:foo { ... }
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
    this.visit(ast.root, { root: ast.root })
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

  declaration: function(node) {
    this.declarations.push(node)
  },

  function: function(node) {
    return node.name + '(' + node.args.join('') + ')'
  },

  animation: function(node) {
    node.name = node.keyframes.name = this.selectors[0]
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
