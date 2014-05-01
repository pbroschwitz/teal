var fs = require('fs')
  , parse = require('css').parse
  , sheet = require('./sheet')
  , rework = require('rework')
  , visitor = require('../visitor')

module.exports = function(teal) {
  return new CSS(teal)
}

function CSS(teal) {
  this.teal = teal
  this.sheets = [sheet(this, 'main')]
  this.plugins = []
}

CSS.prototype.sheet = function(s) {
  this.sheets.push(sheet(s))
  return this.teal
}

CSS.prototype.media = function(names) {
  this.mediaNames = names
  return this.teal
}

CSS.prototype.rework = function(fn) {
  this.plugins.push(fn)
  return this.teal
}

CSS.prototype.mixin = function(mixins) {
  return this.rework(rework.mixin(mixins))
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
  
  ctx.bases.forEach(function(f) {
    var src = fs.readFileSync(f, 'utf8')
    //TODO Rewrite tag selelectors
    //We therefore need to know the module's name
    var res = teal.expose(f)
    var base = parse(src, { source: res.url, position: true })
    rules.push.apply(rules, base.stylesheet.rules)
  })

  ctx.asts.forEach(function(ast) {

    var modRules = []

    visitor.visit(ast, function(on, visit) {

      function visitDeclarations(node, sel) {
        var i = modRules.length
        var decl = visit(node.declarations)
        if (decl.length) {
          modRules.splice(i, 0, {
            type: 'rule',
            selectors: sel || node.selectors,
            declarations: decl,
            position: node.position
          })
        }
      }

      on.root = function(node) {
        visit(node.root)
      }

      on.element = function(node) {
        if (ctx.libs.length > 1 && node.lib)
          node.class = [node.class, node.lib, node.lib + '-' + node.tag].join(' ').trim()

        visitDeclarations(node)
      }

      on.fragment = function(node) {
        visit(node.declarations)
      }

      on.parameter = function(node) {
        visit(node.value)
      }

      on.function = function(node) {
        return node.name + '(' + node.arguments + ')'
      }

      on.reference = function(node) {
        visitDeclarations(node)
      }

      on.content = function(node) {
        visit(node.content)
      }

      on.style = function(node) {
        visitDeclarations(node, node.selectors)
      }

      on.declaration = function(node) {
        return {
          type: 'declaration',
          property: node.property,
          value: visit(node.value).join(' '),
          position: node.position
        }
      }

      on.animation = function(node) {
        rules.unshift({
          type: 'keyframes',
          name: node.name,
          position: node.position,
          keyframes: visit(node.keyframes),
        })
        return {
          type: 'declaration',
          property: 'animation',
          value: node.name + ' ' + node.value,
          position: node.position
        }
      }

      on.keyframe = function(node) {
        return {
          type: 'keyframe',
          values: node.values,
          declarations: visit(node.declarations)
        }
      }

      on.media = function(node) {
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
          declarations: visit(decl),
          position: node.position
        })
        modRules = parentRules
      }

      on.for = function(node) {
        visit(node.body)
      }

      on.if = function(node) {
        visit(node.consequent)
        visit(node.alternate)
      }

    })
    rules.push.apply(rules, modRules)
  })

  rules.push.apply(rules, tail)

  this.sheets.forEach(function(sheet) {
    sheet.write(rules)
  })
}
