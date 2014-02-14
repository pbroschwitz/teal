var fs = require('fs')
  , css = require('css')
  , visitor = require('../visitor')

module.exports = exports = function(teal) {

  var rules
    , modRules
    , source
    , rootClass

  function pos(node) {
    node.position.source = source
    return node.position
  }

  var compile = visitor(function(on, visit) {

    function visitDeclarations(node, sel) {
      var decl = visit(node.declarations)
      if (decl.length) {
        modRules.unshift({
          type: 'rule',
          selectors: sel || node.selectors,
          declarations: decl,
          position: pos(node)
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
      visit(node.content)
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

    on.property = function(node) {
      return {
        type: 'declaration',
        property: node.name,
        value: node.value,
        position: pos(node)
      }
    }

    on.media = function(node) {
      modRules.push({
        type: 'media',
        media: node.media,
        position: pos(node),
        rules: [{
          type: 'rule',
          selectors: node.selectors,
          declarations: visit(node.declarations),
          position: pos(node)
        }]
      })
    }

    on.each = function(node) {
      visit(node.body)
    }
  })

  teal.on('start', function() {
    rules = []
  })

  teal.on('file', function(ast) {
    modRules = []
    source = ast.url
    rootClass = ast.root.class
    compile(ast)
    rules = rules.concat(modRules)
  })

  teal.on('end', function() {
    teal.imports.forEach(function(file) {
      var ast = css.parse(fs.readFileSync(file, 'utf8'), { position: true })
      rules.unshift.apply(rules, ast.stylesheet.rules)
    })
    teal.sheets.forEach(function(sheet) {
      sheet.write(rules)
    })
  })

}

exports.sheet = require('./sheet')