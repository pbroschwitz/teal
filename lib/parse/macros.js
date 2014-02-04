var fs = require('fs')
  , path = require('path')
  , watchify = require('watchify')
  , tealify = require('./tealify')

/**
 * Creates elements to link the stylesheet(s).
 */
exports.stylesheets = function() {
  return this.teal.sheets.map(function(sheet) {
    if (sheet.cc) return { type: 'comment', text: '...' }
    return { type: 'element', tag: 'link', declarations: [
      { type: 'attribute', name: 'rel', value: 'stylesheet' },
      { type: 'attribute', name: 'href', value: sheet.res.url },
    ]}
  })
}

/**
 * Creates a browserify bundle from the given file and returns the URL.
 */
exports.bundle = function(file) {
  var teal = this.teal
    , dir = path.dirname(this.file)
    , root = teal.opts.root
    , f = path.resolve(dir, file)
    , p = '/' + path.relative(root, f)

  var res = teal.resources.get(p)
  if (!res) {
    var stream = watchify().add(f).transform(tealify(teal)).bundle()
    res = teal.expose({ path: p, from: stream })
  }
  return res.url
}

/**
 * Returns an URL for the given file.
 */
exports.url = function(file) {
  var dir = path.dirname(this.file)
  return this.teal.expose(path.resolve(dir, file)).url
}

/**
 * Reads the content of the given file.
 */
exports.read = function(file) {
  var dir = path.dirname(this.file)
  return fs.readFileSync(path.resolve(dir, file))
}