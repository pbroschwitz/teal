var path = require('path')

var debug = require('debug')('teal:prep')
var vow = require('vow')

var expand = require('./expand')
var parse = require('../parse')
var prep = require('./prep')
var resolver = require('../resolver')
var store = require('./store')

var visitors = [
  require('./expand'),
  require('./stats'),
  require('./names')
]

module.exports = function(root, opts) {

  var asts = store()
  var consts = {}
  var deferred

  function defer() {
    var d = vow.defer()
    deferred.push(d.promise())
    return d
  }

  function parseFile(file) {
    var ast
    if (path.extname(file) == '.tl') {
      // expose source files in debug mode
      var url = opts.teal.debug && opts.teal.expose(file).url
      ast = parse.file(file, url)
    }
    else {
      ast = { type: 'root', file: file, ext: path.extname(file) }
    }

    var rel = path.relative(root, file)
    if (rel[0] != '.') ast.path = '/' + rel
    return ast
  }

  return function(files) {
    var preped = []

    function prepare(ast) {
      ast = prep.visit(ast, {
        consts: consts,
        asts: asts,
        file: ast.file,
        defer: defer,
        resolve: resolver(ast.file, root),
        parse: function(f) {
          return prepareFile(this.resolve(f))
        },
        depends: function(f) {
          asts.addDependency(ast.file, f)
        }
      })
      preped.push(ast)
      return ast
    }

    function prepareFile(file) {
      var ast = asts.get(file)
      if (!ast) {
        debug('preparing %s', file)
        ast = parseFile(file)

        // temporarily cache raw to allow cyclic references
        asts.put(ast)

        // replace with the prepared ast
        ast = asts.put(prepare(ast))
      }
      return ast
    }

    asts.invalidate(files).forEach(prepareFile)
    deferred = []
    try {

      var modified = preped.map(function(ast) {
        debug('processing %s', ast.file)
        if (opts.stage === 0) return ast
        var ctx = {
          root: root,
          teal: opts.teal,
          consts: consts,
          defer: defer,
          depends: function(f) {
            asts.addDependency(ast.file, f)
          },
          resolve: resolver(ast.file, root),
          parse: function(f) {
            return prepareFile(f)
          },
          macros: opts.teal.macros,
          functions: opts.teal.css.functions,
          naming: opts.teal.naming
        }
        return asts.put(visitors
          // allow partial processing for unit tests
          .slice(0, opts.stage || 3)
          .reduce(
            function(ast, visitor) {
              return visitor.visit(ast, ctx) || ast
            },
            ast
          )
        )
      })

      // return a promise for an array of all ASTs and files
      return vow.all(deferred).then(function() {
        return {
          cache: asts.cache,
          files: asts.getAllFiles(),
          asts: asts.getAllAsts(),
          modified: modified
        }
      })
    }
    catch (err) {
      return vow.reject(err)
    }
  }
}
