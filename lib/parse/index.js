var PEG = require('pegjs')
  , fs = require('fs')
  , path = require('path')
  , transform = require('./transform')
  , naming = require('./naming')

var grammar = fs.readFileSync(__dirname + '/grammar.pegjs', 'utf8')
  , parser = PEG.buildParser(grammar)

module.exports = function(src, ctx) {
  try {
    var ast = parser.parse(src, ctx)
    ast.file = ctx.file
    //if (!ast.root) return ast
    return naming(transform(ast, ctx), ctx)
  }
  catch (err) {
    if (!err.location) {
      err.file = err.location = ctx.file
      if (err.line) err.location += ':' + err.line + ',' + err.column
    }
    throw err
  }
}
