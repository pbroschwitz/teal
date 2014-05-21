var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , list = require('./list')
  , detective = require('detective')
  , resolve = require('browser-resolve-sync')
  , parse = require('./parse')
  , visitor = require('./visitor')
  , EventEmitter = require('events').EventEmitter

module.exports = function(teal, files) {
  var ctx = new Context(teal)
  var topLevel = files.filter(function(f) {
    return /\.tl/.test(f)
  })

  ctx.process(topLevel)
  teal.processors.forEach(function(p) {
    p.process(ctx)
  })
  return Object.keys(ctx.processed)
}

function Context(teal, files) {
  this.teal = teal
  this.macros = teal.macros
  this.root = teal.opts.root
  this.debug = teal.opts.debug
  this.asts = []
  this.libs = []
  this.processed = {}
  this.classes = {}
  this.expose = teal.expose.bind(teal)
}

util.inherits(Context, EventEmitter)

Context.prototype.process = function(f) {
  if (Array.isArray(f)) return f.map(this.process, this)
  if (f in this.processed) return this.processed[f]

  var method = 'process_' + path.extname(f).slice(1)
  this.processed[f] = { file: f }
  if (this[method]) return this.processed[f] = this[method](f)
}

Context.prototype.process_js = function(f) {
  var src = fs.readFileSync(f, 'utf8')
  var base = path.dirname(f)

  function resolveFile(file) {
    return resolve(file, {
      extensions: ['.js', '.tl'],
      paths: require.main.paths,
      filename: f
    })
  }

  detective(src).map(resolveFile).forEach(this.process, this)
}

Context.prototype.process_tl = function(f) {
  var src = fs.readFileSync(f, 'utf8')
  var url = this.debug && this.expose({ file: f, content: src }).url
  var ctx = new SubContext(this, f, url)
  var ast = parse(src, ctx)
  this.asts.push(ast)
  return ast
}

function SubContext(p, file, url) {
  this.context = p

  this.dir = path.dirname(file)
  this.file = file
  this.url = url

  this.root = p.root
  this.teal = p.teal
  this.expose = p.expose
  this.classes = p.classes

  this.process = p.process.bind(p)
  this.on = p.on.bind(p)
  this.once = p.once.bind(p)

  this.lib = file.replace(/.*?\/lib\/(.+?)(?=\/)/g, '$1,')
      .split(',').slice(0, -1).join('-') || 'tl'

  if (!~p.libs.indexOf(this.lib)) p.libs.push(this.lib)
}

SubContext.prototype.resolve = function(file) {
  if (file[0] == '/') file = path.join(this.root, file)
  else if (file[0] != '.') file = './' + file

  return resolve(file, {
    extensions: ['.js', '.tl'],
    paths: require.main.paths,
    filename: this.file
  })
}

SubContext.prototype.depends = function(file) {
  this.process(file)
}

var evaluate = visitor(function(on) {
  on.concat = function(e) {
    return evaluate(e.left) + evaluate(e.right)
  }
  on.default = function(e) {
    return evaluate(e.expression) || evaluate(e.default)
  }
  on.not = function(e) {
    return !evaluate(e.expression)
  }
  on._array = on._object = function(e) { return e }
})

SubContext.prototype.expand = function(node) {
  var macros = this.teal.macros
    , m = macros[node.name]

  if (!m) return node
  try {
    return m.apply(this, node.arguments.map(evaluate))
  }
  catch (err) {
    err.stack = node.position + '\n' + err.stack
    throw err
  }
}
