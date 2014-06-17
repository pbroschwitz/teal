var fs = require('fs')
  , sheet = require('./sheet')
  , visitor = require('../visitor')
  , scope = require('../scope')
  , comb = require('../util/comb')
  , append = require('../util/append')
  , addTo = require('../util/addTo')
  , flatten = require('flatten')
  , xtend = require('xtend')

module.exports = function(teal) {
  return new CSS(teal)
}

function CSS(teal) {
  this.teal = teal
  this.transforms = []
  this.sheets = teal.builtInGlobals.sheets = [sheet(this, 'main')]
}

CSS.prototype.functions = require('./functions')

CSS.prototype.sheet = function(s) {
  this.sheets.push(sheet(s))
  return this.teal
}

CSS.prototype.transform = function(fn) {
  this.transforms.push(fn)
  return this.teal
}

CSS.prototype.process = function(ctx) {
  var css = this
  var teal = this.teal
  var rules = []
  var tail = []
  var media = {}
  var cssGlobals = scope()

  ctx.asts.forEach(function(ast) {

    var v = visitor({

      root: function(ast) {
        var scope = {
          rules: []
        }

        if (ast.root) {
          // skip fragments/mixins
          if (ast.root.type == 'fragment') return

          // if this module has a root element create a sub-scope
          // otherwise @defaults are set in the global scope
          scope.cssVars = this.cssVars.sub()
        }
        this.visit(ast.settings, scope)
        this.visit(ast.root, scope)

        addTo(rules, scope.rules)
      },

      defaults: function(d) {
        this.cssVars.defaults(d.css)
      },

      element: function(node) {
        this.visitDeclarations(node)
      },

      fragment: function(node) {
        this.visit(node.declarations)
      },

      parameter: function(node) {
        this.visit(node.value)
      },

      function: function(node) {
        var fn = css.functions
        var args = this.visit(node.arguments)
        if (node.name in fn) return fn[node.name].apply(this.ctx, args)
        return node.name + '(' + node.arguments + ')'
      },

      reference: function(node) {
        if (~this.refs.indexOf(node.path)) {
          // cyclic reference
          return
        }
        var ref = ctx.parse(node.path)
        var v = this.cssVars.sub()
        var mixin = ref.root.type == 'fragment'

        this.visitDeclarations(node, {
          filter: this.filter || function(d) {
            // keep the ones that are no params
            if (!mixin && !~ref.cssVars.indexOf(d.property)) return true
            // otherwise set the param accordingly
            v.set(d.property, d.value)
          }
        })

        var includeAll = mixin && !this.nested

        this.visit(ref.root, {
          cssVars: v,
          refs: this.refs.concat(node.path),
          classOverrride: node.class,
          nested: true,
          filter: !includeAll && function(d) {
            // keep the ones that have been parameterized locally
            return d.parameter && v.data[d.parameter]
          }
        })
      },

      content: function(node) {
        this.visit(node.content)
      },

      style: function(node) {
        this.visitDeclarations(node)
      },

      declaration: function(node) {
        if (this.filter && !this.filter(node)) return

        var value = this.visit(node.value, {
          currentDeclaration: node
        })
        .join('').trim()

        this.declarations.push({
          type: 'declaration',
          property: node.property,
          parameter: node.parameter,
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
        rules.unshift({
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
        rules.unshift({
          type: 'rule',
          selectors: ['@font-face'],
          declarations: decl,
          position: node.position
        })
      },

      media: function(node) {

        // visit the media query and evaluate expressions
        var mq = flatten(this.visit(node.media, {
          currentDeclaration: node,
        }))
        .join('').trim()

        var rules = []
        var decl = []

        this.visit(node.declarations, {
          rules: rules,
          declarations: decl
        })

        // apply global filter
        //if (this.filter) decl = decl.filter(this.filter)

        if (decl.length) {
          rules.splice(0, 0, {
            type: 'rule',
            selectors: this.parent.selectors,
            declarations: decl,
            position: node.position
          })
        }

        if (rules.length) {
          var mediaRules = media[mq]
          if (!mediaRules) {
            mediaRules = media[mq] = []
            tail.push({
              type: 'media',
              media: mq,
              position: node.position,
              rules: mediaRules
            })
          }
          addTo(mediaRules, rules)
        }

      },

      value: function(node) {
        return this.visit(node.tokens).join('')
      },

      variable: function(node) {
        if (!this.currentDeclaration) return
        var v = this.cssVars.get(node.name)
        if (!v) {
          //throw new Error('You need to specify a value for $' + node.name)
        }
        return v
      },

      each: function(node) {
        this.visit(node.body)
      },

      if: function(node) {
        this.visit(node.consequent)
        this.visit(node.alternate)
      },

      binary: function(node) {
        if (node.op == '+') return this.visit(node.left) + this.visit(node.right)
      }
    })

    v.visit(ast, {

      // keep track of visited references to detect cyclic dependencies
      refs: [],

      ctx: ctx.sub(ast.file),

      cssVars: cssGlobals,

      stateSelectors: function(state) {
        var n = this.parent
        while (n) {
          if (~n.states.indexOf(state)) return n.selectors
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

        // apply local filter
        //if (ctx.filter) decl = decl.filter(ctx.filter)

        // apply global filter
        //if (this.filter) decl = decl.filter(this.filter)

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
        return [node.class ? '.' + node.class : node.tag]
      },

      select: function (child) {

        if (this.classOverrride && child.isRoot) return ['.' + this.classOverrride]

        if (!this.parent) return this.selectLocal(child)

        var lastSel = this.parent.selectors
        var result = []
        var prefixes
        var c
        this.selectLocal(child).forEach(function(s) {
          if (!s) return
          if (s.parent) {
            prefixes = this.parent.up(s.parent).selectors
            c = /^:/.test(s.selector) ? '' : ' '
            addTo(result, comb(append(prefixes, s.selector), unprefix(lastSel, prefixes), c))
          }
          else if (s.adjacentSibling) {
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
            if (/^:/.test(s)) c = '' // pseudo selector
            else if (/^body$/i.test(s)) c = ' ' // don't use child selector for html > body
            else c = ' > '
            addTo(result, append(lastSel, s, c))
          }
        }, this)

        return result
      }

    })

  })

  addTo(rules, tail)

  this.sheets.forEach(function(sheet) {
    sheet.write(rules)
  })
}

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
