var addTo = require('./addTo')

module.exports = function(obj, prop, items) {
  if (!items || !items.length) return
  var a = obj[prop]
  if (!a) a = obj[prop] = []
  addTo(a, items)
}
