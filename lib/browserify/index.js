var path = require('path')
  , filewatcher = require('filewatcher')
  , browserify = require('browserify')
  , tealify = require('./tealify')

module.exports = function(teal) {
  return new Browserify(teal)
}

function Browserify(teal) {
  this.teal = teal
  this.transforms = []
}
/**
 * Creates a browserify bundle from the given file and returns the URL.
 */
Browserify.prototype.bundle = function(file) {
  var self = this
    , teal = this.teal
    , root = teal.opts.root
    , p = '/' + path.relative(root, file).replace('.js', '') + '.bundle.js'

  var res

  function bundle() {
    var w = filewatcher()
    w.on('change', function() {
      this.removeAll()
      bundle()
    })
    var b = browserify({ extensions: ['.tl'] })
      .on('file', w.add.bind(w))
      .add(file)

    b.transform(tealify(teal))
    self.transforms.forEach(function(tr) { b.transform(tr) })

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