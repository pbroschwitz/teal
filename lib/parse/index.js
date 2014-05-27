var PEG = require('pegjs')
  , fs = require('fs')
  , path = require('path')
  , transform = require('./transform')
  , classes = require('./classes')


var grammar = fs.readFileSync(__dirname + '/grammar.pegjs', 'utf8')
  , parser = PEG.buildParser(grammar)

module.exports = function(src, ctx) {
  try {
    var ast = parser.parse(src, ctx)
    ast.file = ctx.file
    if (ast.root.type == 'mixin') return ast
    return classes(transform(ast, ctx), ctx)
  }
  catch (err) {
    console.log(err)
    err.message = ctx.file + ':\n' + err.message
    throw err
  }
}
