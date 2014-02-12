var fs = require('fs')
  , path = require('path')
  , filewatcher = require('filewatcher')
  , browserify = require('browserify')

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
    , p = '/' + path.relative(root, f).replace('.js', '.bundle.js')

  var res

  function bundle() {
    var w = filewatcher()
    w.on('change', function() {
      this.removeAll()
      bundle()
    })
    var b = browserify({ extensions: ['.tl'] })
      .on('file', w.add.bind(w))
      .add(f)

    teal.transforms.forEach(function(tr) { b.transform(tr) })

    b.bundle({ debug: true }, function(err, src) {
      teal.expose({ path: p, content: src })
    })
  }

  res = teal.resources.get(p)
  if (!res) {
    res = teal.expose({ path: p, content: undefined })
    bundle()
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