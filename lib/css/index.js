var fs = require('fs')
  , parse = require('css').parse
  , sheet = require('./sheet')
  , visitor = require('../visitor')

module.exports = function(teal) {
  return new CSS(teal)
}

function CSS(teal) {
  this.teal = teal
  this.imports = []
  this.sheets = [sheet(this, 'main')]
  this.reworkPlugins = []
}

CSS.prototype.sheet = function(s) {
  this.sheets.push(sheet(s))
}

CSS.prototype.rework = function(fn) {
  this.reworkPlugins.push(fn)
}

CSS.prototype.import = function(file) {
  if (!~this.imports.indexOf(file)) this.imports.push(file)
}

CSS.prototype.process = function(mods) {
  var rules = [].concat.apply([], mods.map(process))
    , imports = [].concat(this.imports)

  imports.forEach(function(file) {
    var ast = parse(fs.readFileSync(file, 'utf8'), { position: true })
    rules.unshift.apply(rules, ast.stylesheet.rules)
  })

  this.sheets.forEach(function(sheet) {
    sheet.write(rules)
  })
}

function process(ast) {

  var rules = []
    , source = ast.url
    , rootClass = ast.root.class

  function pos(node) {
    node.position.source = source
    return node.position
  }

  visitor.visit(ast, function(on, visit) {

    function visitDeclarations(node, sel) {
      var decl = visit(node.declarations)
      if (decl.length) {
        rules.unshift({
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
      rules.push({
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

  return rules
}