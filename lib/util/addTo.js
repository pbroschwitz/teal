/**
 * Adds all `items` to the given `list`.
 */
module.exports = function(list, items) {
  list.push.apply(list, items)
}
