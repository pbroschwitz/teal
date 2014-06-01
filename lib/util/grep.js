/**
 * Filter the list of nodes by the given type.
 */
module.exports = function(list, type) {
  return list.filter(function(node) { return node.type == type })
}
