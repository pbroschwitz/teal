var fs = require('fs')

/**
 * Wrap a given function so that the result is cached until the the mtime of
 * the file argument changes.
 */
function cache(fn, fileArgIndex) {
  var items = {}
  return function() {
    var file = arguments[fileArgIndex || 0]
      , mtime = fs.statSync(file).mtime
      , item = items[file]

    if (item && item.mtime >= mtime) {
      return item.data
    }
    var data = fn.apply(this, arguments)
    items[file] = { mtime: mtime, data: data }
    return data
  }
}

module.exports = exports = cache

exports.method = function(obj, method, fileArgIndex) {
  var fn = obj[method].bind(obj)
  obj[method] = cache(fn)
}
