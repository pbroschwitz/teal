var jison = require('jison')
  , Generator = jison.Generator
  , fs = require('fs')
  , path = require('path')
  , macros = require('./macros')

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
  var dir = path.dirname(opts.file)

  yy.file = opts.file
  yy.class = opts.teal.getClassName(opts.file)

  // collect all dependencies and expose them on the root element
  yy.deps = []
  yy.dep = function(p) {
    p += '.tl'
    if (p[0] == '/') return opts.teal.opts.root + p
    p = path.resolve(dir, p)
    yy.deps.push(p)
    return p
  }

  /**
   * Filter the list of nodes by the given type.
   */
  yy.grep = function(list, type) {
    return list.filter(function(node) { return node.type == type })
  }

  /**
   * Extract a property from a list of nodes.
   */
  yy.pluck = function(list, prop) {
    return list.map(function(node) { return node[prop] })
  }

  /**
   * Expand a macro.
   */
  yy.expand = function(name, args) {
    if (name in macros) return macros[name].apply(opts, args)
    return { type: 'function', name: name, arguments: args }
  }

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

  try {
    return parser.parse(src)
  }
  catch (err) {
    throw new Error(opts.file + ':\n' + err.message)
  }
}
