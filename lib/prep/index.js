var visitor = require('../visitor')
  , scope = require('../scope')

module.exports = function(teal) {
  return new Preprocessor(teal)
}

function Preprocessor(teal) {
  this.visitors = [
    visitor(require('./structure')),
    visitor(require('./naming')),
    visitor(require('./eval'))
  ]
}

Preprocessor.prototype.process = function(ctx) {
  var self = this
    , vars = scope()

  this.visitors.forEach(function(v) {
    ctx.asts = ctx.asts.map(function(ast) {
      return v.visit(ast, {
        vars: vars,
        ctx: ctx.sub(ast.file)
      })
    })
  })
}
