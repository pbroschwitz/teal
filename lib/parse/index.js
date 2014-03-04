var jison = require('jison')
  , Generator = jison.Generator
  , fs = require('fs')
  , path = require('path')
  , transform = require('./transform')
  , classes = require('./classes')


var grammar = fs.readFileSync(__dirname + '/grammar.jison', 'utf8')
  , parser = new Generator(grammar).createParser()

module.exports = function(src, ctx) {
  try {
    parser.yy = ctx
    var ast = parser.parse(src)
    ast.file = ctx.file
    return classes(transform(ast, ctx), ctx)
  }
  catch (err) {
    err.message = ctx.file + ':\n' + err.message
    throw err
  }
}
