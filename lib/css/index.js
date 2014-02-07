var fs = require('fs')
  , css = require('css')
  , visitor = require('../visitor')
  , selector = require('./selector')

module.exports = exports = function(teal) {

  function pos(node) {
    node.position.source = source
    return node.position
  }

  var compile = visitor(function(on, visit) {

    on.root = function(node) {
      return visit(node.root)
    }

    on.element = function(node) {
      var sel = node.class ? '.' + node.class : node.tag

      stack.with(sel, function() {
        var decl = visit(node.declarations)
        if (decl.length) {
          rules.unshift({
            type: 'rule',
            selectors: stack.selectors(),
            declarations: decl,
            position: pos(node)
          })
        }
      })
    }

    on.fragment = function(node) {
      visit(node.content)
    }

    on.parameter = function(node) {
      visit(node.value)
    }

    on.reference = function(node) {
      visit(node.declarations)
    }

    on.content = function(node) {
      visit(node.content)
    }

    on.style = function(node) {
      stack.with(node.selectors, function() {
        var decl = visit(node.declarations)
        if (decl.length) {
          rules.unshift({
            type: 'rule',
            selectors: stack.selectors(),
            declarations: decl,
            position: pos(node)
          })
        }
      })
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
      rules.push({
        type: 'media',
        media: node.media,
        position: pos(node),
        rules: [{
          type: 'rule',
          selectors: stack.selectors(),
          declarations: visit(node.declarations),
          position: pos(node)
        }]
      })
    }

    on.each = function(node) {
      visit(node.body)
    }
  })

  var rules
    , stack
    , selectors
    , source
    , rootClass

  teal.on('start', function() {
    rules = []
  })

  teal.on('file', function(file, ast, url) {
    source = url
    rootClass = ast.root.class
    stack = selector()
    selectors = []
    compile(ast)
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