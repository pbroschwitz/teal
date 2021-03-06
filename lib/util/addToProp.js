var addUnique = require('./addUnique')

module.exports = function(obj, prop, items) {
  if (!items) return
  if (!Array.isArray(items)) items = [items]
  if (items.length) {
    var a = obj[prop]
    if (!a) a = obj[prop] = []
    addUnique(a, items)
  }
}
