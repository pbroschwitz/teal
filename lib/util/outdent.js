module.exports = function(s) {
  var w = /^[\r\n]*(\s+)/.exec(s)
  if (w) return s.replace(new RegExp('^' + w[1], 'mg'), '')
  return s
}
