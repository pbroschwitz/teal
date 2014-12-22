var path = require('path')

var debug = require('debug')('teal:prep')
var uniqs = require('uniqs')
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

  var references = {}
  var referrers = {}

  var deferred

  function addDependency(file, dep) {
    if (file == dep) return
    addToProp(dependencies, file, dep)
    addToProp(dependants, dep, file)
  }

  function addReference(file, ref) {
    if (file == ref) return
    addToProp(references, file, ref)
    addToProp(referrers, ref, file)
  }

  function combine(files, dict) {
    var all = files.slice()
    files.forEach(function(f) {
      addUnique(all, dict[f])
    })
    return all
  }

  function invalidate(files) {
    files.forEach(function(f) {
      cache[f] = dependencies[f] = references[f] = undefined
    })
  }

  function prep(file) {
    var ast = cache[file]
    if (ast) return ast

    debug('preparing %s', file)

    if (path.extname(file) == '.tl') {
      // create a context that resolves paths relative to the current file
      var ctx = context(file)

      // expose source files in debug mode
      var url = opts.teal.debug && opts.teal.expose(file).url

      ast = visitors
        // allow partial processing for unit tests
        .slice(0, opts.stage || 3)
        .reduce(
          function(ast, visitor) {
            return visitor.visit(ast, ctx)
          },
          // store a reference to the raw AST so that (in case of a cyclic
          // reference) we can still peek into the referenced file
          cache[file] = parse.file(file, url)
        )
    }
    else {
      ast = { type: 'root', file: file, ext: path.extname(file) }
    }

    var rel = path.relative(root, file)
    if (rel[0] != '.') ast.path = '/' + rel

    return cache[file] = ast
  }

  function context(file) {
    var resolve = resolver(file, root)
    return xtend(opts, {

      vars: vars,

      file: file,

      root: root,

      resolve: resolve,

      defer: function() {
        var d = vow.defer()
        deferred.push(d.promise())
        return d
      },

      getReferrers: function(f) {
        return referrers[f || file]
      },

      getReferences: function(f) {
        return references(f || file)
      },

      getTransitiveRefs: function(f) {
        var all = []
        function addRefs(f) {
          all.push(f)
          var refs = references[f]
          if (refs) refs.forEach(function(r) {
            if (!~all.indexOf(r)) addRefs(r)
          })
        }
        addRefs(f || file)
        return all
      },

      depends: function(f) {
        addDependency(file, f)
      },

      parse: function(f) {
        addReference(file, f)
        var ast = prep(f)
        if (ast.root && ast.root.type == 'mixin') {
          this.depends(f)
        }
        return ast
      }
    })
  }

  return function(files) {
    files = combine(files, dependants)
    invalidate(files)
    deferred = []
    try {
      files.forEach(prep)
      // return a promise for an array of all ASTs and files
      return vow.all(deferred).then(function() {
        return {
          cache: cache,
          files: uniqs(Object.keys(cache), Object.keys(dependants)),
          asts: Object.keys(cache).map(prep),
          modified: files.map(prep)
        }
      })
    }
    catch (err) {
      return vow.reject(err)
    }

  }
}
