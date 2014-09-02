var scope = require('../scope')
var parse = require('../parse')
var resolver = require('../resolver')

var visitors = [
  require('./structure'),
  require('./naming'),
  require('./eval')
]

module.exports = function(root, opts) {
  if (!opts) opts = {}
  var vars = scope()
  var cache = opts.cache || {}

  function prep(file) {
    var ast = cache[file]
    if (ast) return ast

    // create a context that resolves paths relative to the current file
    var ctx = context(file)

    return cache[file] = visitors
      // allow partial processing for unit tests
      .slice(0, opts.stage || 3)
      .reduce(
        function(ast, visitor) {
          return visitor.visit(ast, ctx)
        },
        // store a reference to the raw AST so that (in case of a cyclic
        // reference) we can still peek into the referenced file
        cache[file] = parse.file(file)
      )
  }

  function context(file) {
    var resolve = resolver(file, root)
    return {

      vars: vars,

      root: root,

      resolve: resolve,

      parse: function(file) {
        return prep(resolve(file))
      },

      all: function(files) {
        // invalidate the cached versions
        files.forEach(function(f) { cache[f] = undefined })

        files.forEach(prep)

        // return an array of all cached ASTs
        return Object.keys(cache).map(function(f) { return cache[f] })
      }
    }
  }

  return context()

}
