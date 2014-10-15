var path = require('path')

var resolve = require('resolve')

module.exports = function(base, root) {
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
      // CommonJS module
      return resolve.sync(file, {
        extensions: ['.js', '.tl'],
        paths: require.main.paths,
        basedir: dir
      })
    }
    catch (err) {
      err.message = 'Cannot find ' + file + '.{tl,js}'
      err.dir = path.dirname(file)
      throw err
    }
  }
}
