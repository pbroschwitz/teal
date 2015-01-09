var visitor = require('../visitor')

/**
 * Set @const values and peek into referenced asts.
 */
module.exports = visitor({

  mixin: function(node) {
    if (this.mixin) return this.mapObject(node)
    else return node
  },

  const: function(node) {
    var consts = this.consts
    if (node.declarations) node.declarations.forEach(function(d) {
      consts[d.property] = d.value
    })
  },

  path: function(node) {
    node.file = this.resolve(node.path)
  },

  element: function(node) {
    this.visit(node.name)
    if (node.name.path) {
      var ref = this.parse(node.name.path)
        
      if (ref.ext) {
        // not a .tl file, just remember the extension
        node.ext = ref.ext
      }
      else if (ref.root) {
        if (ref.root.type == 'mixin') {
          // mix in the referenced content
          node.mixin = this.visit(ref.root, { mixin: true })
          this.depends(ref.file)
        }
        else {
          // remember the tag name
          node.tag = ref.root.name
          this.asts.addReference(this.file, ref.file)
        }
      }

      node.ref = ref.path || node.name.path // in case of an npm module
    }
    else {
      node.tag = node.name
    }
    this.visit(node.content)
    return node
  },

  _object: function(node) {
    return this.mapObject(node)
  }

})
