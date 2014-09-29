var addTo = require('./addTo')
var append = require('./append')

/**
 * Return a new list with all items in list `b` appended to each item in
 * list `a`
 */
module.exports = function(a, b, combinator) {
  if (a && !Array.isArray(a)) a = [a]
  if (!b) return a

  if (!Array.isArray(b)) b = [b]
  if (!a) return b

  var result = []
  b.forEach(function(s) {
    addTo(result, append(a, s, combinator))
  })
  return result
}
