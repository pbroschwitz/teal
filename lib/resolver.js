var util = require('util')
var path = require('path')

var resolve = require('resolve')

function resolver(base, root) {
  var dir = base ? path.dirname(base) : root
  if (!root) root = dir

  if (typeof dir != 'string') throw Error()

  return function(file) {
    if (file[0] == '/') {
      // relative to the configured root dir
      file = path.join(root, file)
    }
    else if (file[0] == '.') {
      // relative to the base file
      file = path.resolve(dir, file)
    }

    try {
      return resolve.sync(file, {
        extensions: resolver.extensions,
        paths: require.main.paths,
        basedir: dir
      })
    }
    catch (err) {
      err.message = util.format('Cannot find %s{%s}', file, resolver.extensions)
      err.dir = path.dirname(file)
      err.file = base
      throw err
    }
  }
}

resolver.extensions = ['.js', '.tl']

module.exports = resolver
