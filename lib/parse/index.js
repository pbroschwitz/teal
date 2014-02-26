var jison = require('jison')
  , Generator = jison.Generator
  , fs = require('fs')
  , path = require('path')
  , transform = require('./transform')
  , classes = require('./classes')
  , macros = require('./macros')


var grammar = fs.readFileSync(__dirname + '/grammar.jison', 'utf8')
  , parser = new Generator(grammar).createParser()
  , yy = parser.yy = {}


module.exports = function(opts) {
  var src = fs.readFileSync(opts.file, 'utf8')
    , dir = path.dirname(opts.file)

  var ctx = {
    resolve: function(file) {
      return path.resolve(dir, file)
    },
    deps: [],
    teal: opts.teal
  }

  /**
   * Add a `position` object to `$$` that is compatible with the CSS ast.
   */
  yy.pos = function($$, start, end) {
    if (opts.position !== false) {
      $$.position = {
        file: opts.file,
        source: opts.url,
        start: {
          line: start.first_line,
          column: start.first_column+1
        },
        end: {
          line: end.last_line,
          column: end.last_column+1
        },
        toString: function() {
          return this.file + ':' + this.start.line + ',' + this.start.column
        }
      }
    }
    return $$
  }

  yy.expand = function(node) {
    if (node.name in macros) {
      try {
        return macros[node.name].apply(ctx, node.arguments)
      }
      catch (err) {
        err.stack = node.position + '\n' + err.stack
        throw err
      }
    }
  }

  try {
    var ast = parser.parse(src)
    ast.deps = ctx.deps
    return classes(transform(ast, opts), opts)
  }
  catch (err) {
    err.message = opts.file + ':\n' + err.message
    throw err
  }
}
