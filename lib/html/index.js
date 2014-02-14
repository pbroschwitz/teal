var visitor = require('../visitor')
  , dom = require('./dom')
  , visit = visitor(dom)

module.exports = function(teal) {
  return {
    compile: function(file) {
      var ast = teal.parse(file)
      return visit(ast)
    },
    register: function() {
      var html = this
      teal.on('file', function(ast) {
        var cls = ast.root.class
        var code = visit(ast) //cache?
        teal.expose({ file: ast.file + '.js', content: code, className: cls })
      })
    }
  }
}

