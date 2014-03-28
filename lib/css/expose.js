var path = require('path')
  , visit = require('rework').visit

var re = /(url\([\s"']*)(.*?)([\s"']*\))/g

/**
 * Create a rework plugin that calls `teal.expose()` for each `url(...)` that
 * is found in the CSS.
 */
module.exports = function(teal) {
  return function(style) {
    visit.declarations(style, function(declarations) {
      declarations.forEach(function(decl) {
        if ('comment' == decl.type) return
        decl.value = decl.value.replace(re, function($0, $1, url, $2) {
          var dir = path.dirname(decl.position.file)
          var file = path.resolve(dir, url)
          try {
            return $1 + teal.expose(file).url + $2
          }
          catch (err) {
            err.stack = decl.position + '\n' + err.stack
            throw err
          }
        })
      })
    })
  }
}
