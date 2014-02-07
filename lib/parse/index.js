var jison = require('jison')
  , Generator = jison.Generator
  , fs = require('fs')
  , path = require('path')
  , macros = require('./macros')
  , transform = require('./transform')

function read(file, dir) {
  if (dir) file = path.resolve(dir, file)
  return fs.readFileSync(file, 'utf8')
}

var grammar = read('grammar.jison', __dirname)
  , parser = new Generator(grammar).createParser()
  , yy = {}

parser.yy = yy

module.exports = function(opts) {
  if (typeof opts == 'string') opts = { file: opts }
  var src = opts.src || read(opts.file, opts.dir)

  /**
   * Add a `position` object to `$$` that is compatible with the CSS ast.
   */
  yy.pos = function($$, start, end) {
    if (opts.position !== false) {
      $$.position = {
        file: opts.file,
        start: {
          line: start.first_line,
          column: start.first_column+1
        },
        end: {
          line: end.last_line,
          column: end.last_column+1
        }
      }
    }
    return $$
  }

  /**
   * Expand a macro.
   */
  yy.expand = function(name, args) {
    if (name in macros) return macros[name].apply(opts, args)
    return { type: 'function', name: name, arguments: args }
  }

  try {
    return transform(opts.teal, opts.file, parser.parse(src))
  }
  catch (err) {
    throw err
    throw new Error(opts.file + ':\n' + err.message)
  }
}
