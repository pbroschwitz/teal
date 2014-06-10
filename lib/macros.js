var fs = require('fs')
  , mime = require('mime')

/**
 * Creates elements to link the stylesheet(s).
 */
exports.stylesheets = function() {
  return this.teal.css.sheets.map(function(sheet) {
    if (sheet.cc) return { type: 'comment', text: '...' }
    return { type: 'element', tag: 'link', declarations: [
      { type: 'attribute', name: 'rel', value: 'stylesheet' },
      { type: 'attribute', name: 'href', value: sheet.res.url },
    ]}
  })
}

/**
 * This macro merely exists to allow the evaluation of arguments (like other
 * functions or variables).
 */
exports.url = function(s) {
  return 'url("' + s + '")'
}

/**
 * format() as used in @font-face. The argument must be a (quoted) string in
 * Firefox even if it is a valid identifier.
 */
exports.format = function(s) {
  return 'format("' + s + '")'
}

/**
 * Concatenates the arguments.
 */
exports.concat = function(/* ...*/) {
  return Array.prototype.join.call(arguments, '')
}

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
