var fs = require('fs')
  , sheet = require('./sheet')
  , visitor = require('../visitor')
  , scope = require('../scope')
  , list = require('../list')
  , comb = list.cartesian
  , flatten = list.flatten
  , dict = list.dict

module.exports = function(teal) {
  return new CSS(teal)
}

function CSS(teal) {
  this.teal = teal
  this.transforms = []
  this.sheets = [sheet(this, 'main')]
}

CSS.prototype.sheet = function(s) {
  this.sheets.push(sheet(s))
  return this.teal
}

CSS.prototype.media = function(names) {
  this.mediaNames = names
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

  function resolve(mq) {
    if (css.mediaNames) Object.keys(css.mediaNames).forEach(function(n) {
      mq = mq.split(n).join(css.mediaNames[n])
    })
    return mq
  }

  ctx.asts.forEach(function(ast) {

    var modRules = []
    var v = visitor({

      root: function(node) {
        this.visit(node.root, {
          cssVars: this.cssVars.sub({}, node.cssDefaults)
        })
      },

      element: function(node) {
        this.visitDeclarations(node)
      },

      fragment: function(node) {
        this.visit(node.declarations)
      },

      include: function(node) {
        var params = dict(this.visit(node.declarations), 'property')
        return this.visit(node.ast, {
          cssVars: this.cssVars.sub(params)
        })
      },

      parameter: function(node) {
        this.visit(node.value)
      },

      function: function(node) {
        return node.name + '(' + node.arguments + ')'
      },

      reference: function(node) {
        if (~this.refs.indexOf(node.path)) {
          // cyclic reference
          return
        }
        var ref = ctx.parse(node.path)
        var v = this.cssVars.sub()
        this.visitDeclarations(node, null, function(d) {
          if (!~ref.cssVars.indexOf(d.property)) return true
          v.set(d.property, d.value)
        })
        var prefixes = node.parent ? node.parent.selectors : []
        this.visit(ref.root, {
          cssVars: v,
          refs: this.refs.concat(node.path),
          prefixes: prefixes,
          filter: function(d) {
            return d.parameterized
          }
        })
      },

      content: function(node) {
        this.visit(node.content)
      },

      style: function(node) {
        this.visitDeclarations(node, node.selectors)
      },

      declaration: function(node) {
        var value = this.visit(node.value, {
          currentDeclaration: node
        })
        .join('').trim()

        return {
          type: 'declaration',
          property: node.property,
          parameterized: node.parameterized,
          value: value,
          position: node.position
        }
      },

      animation: function(node) {
        this.visit(node.keyframes)
        return {
          type: 'declaration',
          property: 'animation',
          value: node.name + ' ' + node.value,
          position: node.position
        }
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
        return {
          type: 'keyframe',
          values: node.values,
          declarations: this.visit(node.declarations)
        }
      },

      font: function(node) {
        rules.unshift({
          type: 'rule',
          selectors: ['@font-face'],
          declarations: this.visit(node.declarations),
          position: node.position
        })
      },

      media: function(node) {
        var mq = resolve(node.media)
        var parentRules = modRules
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

        modRules = mediaRules
        var decl = node.declarations
        mediaRules.push({
          type: 'rule',
          selectors: node.parent.selectors,
          declarations: this.visit(decl),
          position: node.position
        })
        modRules = parentRules
      },

      value: function(node) {
        return this.visit(node.tokens).join('')
      },

      variable: function(node) {
        if (!this.currentDeclaration) return
        var v = this.cssVars.get(node.name)
        if (!v) {
          throw new Error('You need to specify a default value for %' + node.name + ' using @defaults.')
        }
        return v
      },

      each: function(node) {
        this.visit(node.body)
      },

      if: function(node) {
        this.visit(node.consequent)
        this.visit(node.alternate)
      }
    })

    v.visit(ast, {
      cssVars: scope(),
      refs: [],
      filter: Boolean,
      prefixSelectors: function(sel) {
        if (!this.prefixes) return sel
        return comb(this.prefixes, sel, ' > ')
      },
      visitDeclarations: function(node, sel, filter) {
        var i = modRules.length
        var decl = flatten(this.visit(node.declarations)).filter(filter || this.filter)
        if (decl.length) {
          modRules.splice(i, 0, {
            type: 'rule',
            selectors: this.prefixSelectors(sel || node.selectors),
            declarations: decl,
            position: node.position
          })
        }
      }
    })

    rules.push.apply(rules, modRules)
  })

  rules.push.apply(rules, tail)

  this.sheets.forEach(function(sheet) {
    sheet.write(rules)
  })
}
