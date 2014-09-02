var visitor = require('../../lib/visitor')

var stripPaths = visitor({
  _object: function(o) {
    if ('file' in o) delete o.file
    if ('position' in o) delete o.position
    return this.mapObject(o)
  }
})

module.exports = function(ast) {
  return stripPaths.visit(ast)
}
