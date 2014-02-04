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
      teal.on('file', function(file) {
        var ast = teal.parse(file)
        var cls = ast.root.class
        var code = html.compile(file)
        teal.expose({ file: file + '.js', content: code, className: cls })
      })
    }
  }
}

