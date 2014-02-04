var fs = require('fs')
  , css = require('css')
  , visitor = require('../visitor')

module.exports = exports = function(teal) {

  function pos(node) {
    node.position.source = source
    return node.position
  }

  function select(sel) {
    sel = stack.slice(-1).concat(sel).join(' > ')
    if (~selectors.indexOf(sel)) throw Error('Amgibigous selector: ' + sel)
    return sel
  }

  var compile = visitor(function(on, visit) {

    on.root = function(node) {
      return visit(node.root)
    }

    on.element = function(node) {
      var sel = select(node.tag)
      if (node.class) {
        sel = select('.' + node.class)
      }

      stack.push(sel)
      var decl = visit(node.declarations)
      if (decl.length) {
        selectors.push(sel)
        rules.unshift({
          type: 'rule',
          selectors: [sel],
          declarations: decl,
          position: pos(node)
        })
      }
      stack.pop()
    }

    on.fragment = function(node) {
      visit(node.content)
    }

    on.parameter = function(node) {
      node.value.class = _class + '-' + node.name
      visit(node.value)
    }

    on.reference = function(node) {
      visit(node.declarations)
    }

    on.content = function(node) {
      visit(node.content)
    }

    on.style = function(node) {
      var decl = visit(node.declarations)
      if (decl.length) {
        var prefix = stack.join(' > ')
        rules.unshift({
          type: 'rule',
          selectors: node.selectors.map(function(s) { return prefix + s }),
          declarations: decl,
          position: pos(node)
        })
      }
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
          selectors: [stack.join('>')],
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
    stack = []
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