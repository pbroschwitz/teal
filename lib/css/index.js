var fs = require('fs')
  , sheet = require('./sheet')
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

CSS.prototype.process = function(mods) {
  var rules = []
  mods.forEach(function(ast) {
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
