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

CSS.prototype.rework = function(fn) {
  this.plugins.push(fn)
  return this.teal
}

CSS.prototype.mixin = function(mixins) {
  return this.rework(rework.mixin(mixins))
}

CSS.prototype.process = function(ctx) {
  var rules = []
  ctx.bases.forEach(function(f) {
    var src = fs.readFileSync(f, 'utf8')
    //TODO Rewrite tag selelectors
    //We therefore need to know the module's name
    rules.push.apply(rules, parse(src).stylesheet.rules)
  })

  ctx.asts.forEach(function(ast) {
    var modRules = []
    visitor.visit(ast, function(on, visit) {

      function visitDeclarations(node, sel) {
        var decl = visit(node.declarations)
        if (decl.length) {
          modRules.unshift({
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
        return JSON.parse(JSON.stringify(node))
      }

      on.animation = function(node) {
        rules.unshift({
          type: 'keyframes',
          name: node.name,
          position: node.position,
          keyframes: node.keyframes
        })
        return {
          type: 'declaration',
          property: 'animation',
          value: node.name + ' ' + node.value,
          position: node.position
        }
      }

      on.media = function(node) {
        modRules.push({
          type: 'media',
          media: node.media,
          position: node.position,
          rules: [{
            type: 'rule',
            selectors: node.selectors,
            declarations: visit(node.declarations),
            position: node.position
          }]
        })
      }

      on.each = function(node) {
        visit(node.body)
      }
    })
    rules.push.apply(rules, modRules)
  })

  this.sheets.forEach(function(sheet) {
    sheet.write(rules)
  })
}
