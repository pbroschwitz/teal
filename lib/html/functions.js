var fs = require('fs')
  , mime = require('mime')

/**
 * Returns an URL for the given file.
 */
exports.src = function(file) {
  if (~file.indexOf('//') || ~file.indexOf(':')) return file
  return this.expose(this.resolve(file)).url
}

/**
 * Reads the content of the given file.
 */
exports.read = function(file) {
  return fs.readFileSync(this.resolve(file), 'utf8')
}


exports.data = function(mime, s) {
  return 'data:'+mime+';base64,' + new Buffer(s).toString('base64')
}

exports.inline = function(f) {
  return exports.data(mime.lookup(f), exports.read(f))
}
