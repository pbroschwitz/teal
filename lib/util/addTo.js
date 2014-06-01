/**
 * Returns a bound function that adds items to the given `list`.
 */
module.exports = function(list) {
  return function(items) {
    list.push.apply(list, items)
  }
}
