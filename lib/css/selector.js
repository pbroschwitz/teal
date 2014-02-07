
module.exports = function() {
  var stack = []
  return {
    with: function(sel, fn) {
      stack.push(sel)
      fn()
      stack.pop()
    },
    selectors: function() {
      var ret = [stack.slice(0,1)]
      stack.slice(1).forEach(function(s) {

        if (Array.isArray(s)) {
          var prefixes = ret
          ret = []
          s.forEach(function(s) {
            ret.push.apply(ret, prefixes.map(function(p) {
              if (s.parent) return insert(p, s.selector, -s.parent)
              return p.concat(s)
            }))
          })
        }
        else {
          ret.forEach(function(sel) {
            sel.push(' > ' + s)
          })
        }
      })
      return strings(ret)
    }
  }
}

function strings(array) {
  return array.map(function(a) { return a.join('') })
}

function insert(a, item, index) {
  return a.slice(0, index).concat(item, a.slice(index))
}
