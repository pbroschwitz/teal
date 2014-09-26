/**
 * Adds all `items` to the given `list`.
 */
module.exports = function(list, items) {
  if (items && items.length) list.push.apply(list, items)
}
