var path = require('path')

var vow = require('vow')
var xtend = require('xtend')

var addToProp = require('../util/addToProp')
var addUnique = require('../util/addUnique')
var parse = require('../parse')
var resolver = require('../resolver')
var scope = require('../scope')

var visitors = [
  require('./structure'),
  require('./naming'),
  require('./eval')
]

module.exports = function(root, opts) {
  if (!opts) opts = {}

  var vars = scope()
  var cache = opts.cache || {}

  var dependencies = {}
  var dependants = {}

  var deferred

  function addDependency(file, dep) {
    if (file == dep) return
    addToProp(dependencies, file, dep)
    addToProp(dependants, dep, file)
  }

  function withDependants(files) {
    var all = files.slice()
    files.forEach(function(f) {
      addUnique(all, dependants[f])
    })
    return all
  }

  function withDependencies(files) {
    var all = files.slice()
    files.forEach(function(f) {
      addUnique(all, dependencies[f])
    })
    return all
  }

  function invalidate(files) {
    files.forEach(function(f) {
      cache[f] = dependants[f] = undefined
    })
  }

  function prep(file) {
    var ast = cache[file]
    if (ast) return ast
    //console.log('prep', file)
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
    return xtend(opts, {

      vars: vars,

      root: root,

      resolve: resolve,

      defer: function() {
        var d = vow.defer()
        deferred.push(d.promise())
        return d
      },

      depends: function(f) {
        addDependency(file, f)
      },

      dependsRecursive: function(f) {
        if (f == file) return
        this.depends(f)
        if (dependencies[f]) dependencies[f].forEach(this.dependsRecursive, this)
      },

      parse: function(f) {
        return path.extname(f) == '.tl' && prep(f)
      }
    })
  }

  return function(files) {
    files = withDependants(files).filter(function(f) {
      return path.extname(f) == '.tl'
    })

    invalidate(files)
    deferred = []
    try {
      files.forEach(prep)
      // return a promise for an array of all ASTs and files
      return vow.all(deferred).then(function() {
        return {
          files: withDependencies(Object.keys(cache)),
          asts: Object.keys(cache).map(function(f) { return cache[f] })
        }
      })
    }
    catch (err) {
      return vow.reject(err)
    }

  }
}
