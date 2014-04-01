var fs = require('fs')

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
 * Returns an URL for the given file.
 */
exports.url = function(file) {
  return this.expose(this.resolve(file)).url
}

/**
 * Reads the content of the given file.
 */
exports.read = function(file) {
  return fs.readFileSync(this.resolve(file), 'utf8')
}
