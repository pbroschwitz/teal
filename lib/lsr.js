var fs = require('fs')
  , path = require('path')
  , join = path.join

module.exports = function(dir) {
  var dirs = ['']
  var result = []
  while (dirs.length) {
    var subdir = dirs.shift()
    fs.readdirSync(join(dir, subdir)).forEach(function(entry) {
      var stat = fs.statSync(join(dir, subdir, entry))
      if (stat.isDirectory()) {
        dirs.push(join(subdir, entry))
      }
      result.push(join(dir, subdir, entry))
    })
  }
  return result
}
