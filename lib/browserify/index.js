var path = require('path')
  , filewatcher = require('filewatcher')
  , browserify = require('browserify')
  , through = require('through')
  , convert = require('convert-source-map')
  , Promise = require('Promise')

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
 * Creates a browserify bundle from the given file and returns a Promise
 * for ...
 */
Browserify.prototype.bundle = function(file) {
  var self = this
    , teal = this.teal
    , p = getBundlePath(file, teal.opts.root)

  var res
    , deps

  function bundle() {

    var sources = {}

    return new Promise(function(resolve, reject) {

      // Re-bundle if a file is changed
      var w = filewatcher()
      w.on('change', function() {
        this.removeAll()
        deps = bundle()
      })

      var b = browserify({ extensions: ['.tl'] })

      // Register transforms
      b.transform(function(file) {
        if (path.extname(file) != '.tl') return through()
        return through(function() {}, function() {
          var res = sources[file] = teal.html.compile(file)
          this.queue(res.data)
          this.queue(null)
        })
      })

      self.transforms.forEach(function(tr) { b.transform(tr) })

      // Watch bundled files
      b.on('file', w.add.bind(w))

      b.add(file).bundle({ debug: true }, function(err, src) {
        if (err) return reject(err)

        // Parse the inlined source-map
        var inlined = convert.fromSource(src).toObject()

        // Rewrite the URLs to the exposed sources
        inlined.sources = inlined.sources.map(function(f) {
          var src = sources[f] || teal.expose(f)
          return src.url
        })

        // Remove the inlined source code
        delete inlined.sourcesContent

        var map = teal.expose({ path: p + '.map', content: JSON.stringify(inlined) })
        res.update(convert.removeComments(src) + '\n//# sourceMappingURL=' + map.url)

        resolve(w.list().filter(isTealFile))
      })
    })
  }

  res = teal.resources.get(p)
  if (!res) {
    res = teal.expose({ path: p, pending: true })
    deps = bundle()
  }

  return {
    res: res,
    deps: deps
  }

}

function getBundlePath(file, root) {
  return '/' + path.relative(root, file)
    .replace(/\.\.\//g, '_')
    .replace('.js', '')
    + '.bundle.js'
}

function isTealFile(f) {
  return path.extname(f) == '.tl'
}
