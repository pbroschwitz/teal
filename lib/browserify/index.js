var path = require('path')
  , filewatcher = require('filewatcher')
  , browserify = require('browserify')
  , convert = require('convert-source-map')
  , tealify = require('./tealify')

module.exports = function(teal) {
  return new Browserify(teal)
}

function Browserify(teal) {
  this.teal = teal
  this.transforms = []
}

Browserify.prototype.transform = function(tr) {
  this.transforms.push(tr)
  return this.teal
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

      var inlined = convert.fromSource(src).toObject()

      inlined.sources = inlined.sources.map(function(f) {
        return teal.expose(f).url
      })
      delete inlined.sourcesContent

      var map = teal.expose({ path: p + '.map', content: JSON.stringify(inlined) })
      res.update(convert.removeComments(src) + '\n//# sourceMappingURL=' + map.url)
    })
  }

  res = teal.resources.get(p)
  if (!res) {
    res = teal.expose({ path: p, pending: true })
    bundle()
  }
  return res.url
}