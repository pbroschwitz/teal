module.exports = function(list, items) {
  if (items) items.forEach(function(i) {
    if (!~list.indexOf(i)) list.push(i)
  })
  return list
}
