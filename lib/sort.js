var toposort = require('toposort')

module.exports = function(mods) {
  var edges = []
  var nodes = []
  for (var f in mods) {
    var mod = mods[f]
    nodes.push(mod)
    if (mod.deps.length) {
      edges = edges.concat(mod.deps.map(function(d) { return [mods[d], mod] }))
    }
  }
  return toposort.array(nodes, edges)
}
