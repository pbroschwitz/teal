var escaped = /\\(.)/g // escaped character

module.exports = function unquote(s) {
  if (!s || s.length < 2) return s // too short to b a quoted string

  var first = s.charAt(0)
  var last = s.slice(-1)

  if (first != last || (first != "'" && first != '"')) {
    // unbalanced (or no quotes at all)
    return s
  }

  return s.slice(1, -1).replace(escaped, '$1')

  return s
}
