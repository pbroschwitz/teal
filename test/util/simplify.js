var visitor = require('../../lib/visitor')

var stripPaths = visitor({
  _object: function(o) {

    if (o.file && o.file[0] == '/') {
      o.file = o.file.replace(this.root || /.*(?=\/)/, '<root>')
    }

    if (o.path && this.root && ~o.path.indexOf(this.root))
      o.path = o.path.replace(this.root, '<root>')

    if ('position' in o) delete o.position
      
    return this.mapObject(o)
  }
})

module.exports = function(ast, root) {
  return stripPaths.visit(ast, { root: root })
}
