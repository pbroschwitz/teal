/**
 * Return a new list with `str` appended to each item in `list`.
 */
module.exports = function(list, str, combinator) {
  return list.map(function(i) { return i + (combinator||'') + str })
}
