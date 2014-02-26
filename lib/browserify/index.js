var path = require('path')
  , filewatcher = require('filewatcher')
  , browserify = require('browserify')
  , convert = require('convert-source-map')
  , tealify = require('./tealify')
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
    , root = teal.opts.root
    , p = '/' + path.relative(root, file).replace('.js', '') + '.bundle.js'


  var res
    , deps

  function bundle() {

    return new Promise(function(resolve, reject) {

      // Re-bundle if a file is changed
      var w = filewatcher()
      w.on('change', function() {
        this.removeAll()
        deps = bundle()
      })

      var b = browserify({ extensions: ['.tl'] })

      // Register transforms
      b.transform(tealify(teal))
      self.transforms.forEach(function(tr) { b.transform(tr) })

      // Watch bundled files
      b.on('file', w.add.bind(w))

      b.add(file).bundle({ debug: true }, function(err, src) {

        if (err) return reject(err)

        /*
        // Parse the inlined source-map
        var inlined = convert.fromSource(src).toObject()

        // Rewrite the URLs to the exposed sources
        inlined.sources = inlined.sources.map(function(f) {
          //TODO expose the transformed source!
          return teal.expose(f).url
        })

        // Remove the inlined source code
        delete inlined.sourcesContent

        var map = teal.expose({ path: p + '.map', content: JSON.stringify(inlined) })
        res.update(convert.removeComments(src) + '\n//# sourceMappingURL=' + map.url)
        */
        res.update(src)
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

function isTealFile(f) {
  return path.extname(f) == '.tl'
}
