var addUnique = require('./addUnique')

module.exports = function(obj, prop, items) {
  if (!items || !items.length) return
  var a = obj[prop]
  if (!a) a = obj[prop] = []
  addUnique(a, items)
}
