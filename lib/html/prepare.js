module.exports = function(html) {
  return {
    function: function(node) {
      if (node.name) {
        var fn = html.functions[node.name]
        if (fn) return this.visit(fn.apply(this.ctx, node.arguments))
      }
      return this.mapObject(node)
    },

    _object: function(o) {
      return this.mapObject(o)
    }
  }
}
