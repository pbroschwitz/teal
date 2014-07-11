var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , detective = require('detective')
  , resolve = require('browser-resolve-sync')
  , parse = require('./parse')
  , EventEmitter = require('events').EventEmitter

module.exports = function(teal, files) {
  var ctx = new Context(teal)
  ctx.parse(files)
  teal.processors.forEach(function(p) {
    p.process(ctx)
  })
  return Object.keys(ctx.parsed)
}

function Context(teal, files) {
  this.teal = teal
  this.root = teal.opts.root
  this.debug = teal.opts.debug
  this.asts = []
  this.parsed = {}
  this.expose = teal.expose.bind(teal)
}

util.inherits(Context, EventEmitter)

Context.prototype.parse = function(f) {
  if (Array.isArray(f)) return f.map(this.parse, this)
  if (f in this.parsed) return this.parsed[f]
  // Allow circular references:
  this.parsed[f] = { file: f }

  var method = 'parse_' + path.extname(f).slice(1)
  if (this[method]) return this.parsed[f] = this[method](f)
}

Context.prototype.parse_tl = function(f) {
  var src = fs.readFileSync(f, 'utf8')
  var url = this.debug && this.expose({ file: f, content: src }).url
  var ctx = this.sub(f, url)
  var ast = parse(src, ctx)
  this.asts.push(ast)
  return ast
}

Context.prototype.sub = function(file, url) {
  return new SubContext(this, file, url)
}

function SubContext(parent, file, url) {
  this.context = parent

  this.dir = path.dirname(file)
  this.file = file
  this.url = url

  this.root = parent.root
  this.teal = parent.teal
  this.expose = parent.expose

  // Delegate methods to the parent context
  this.parse = parent.parse.bind(parent)
  this.on = parent.on.bind(parent)
  this.once = parent.once.bind(parent)
}

SubContext.prototype.resolve = function(file) {
  if (file[0] == '/') {
    // relative to the configured root dir
    file = path.join(this.root, file)
  }
  else if (file[0] == '.') {
    // relative to the current file
    file = path.resolve(this.dir, file)
  }
  try {
    return resolve(file, {
      extensions: ['.js', '.tl'],
      paths: require.main.paths,
      filename: this.file
    })
  }
  catch (err) {
    err.message = 'Cannot find ' + file + '.{tl,js}'
    err.dir = path.dirname(file)
    throw err
  }

}

SubContext.prototype.resolveDependency = function(file) {
  var f = this.resolve(file)
  this.parse(f) //TODO just enqueue!
  return f
}

//TODO Use resolveDependency instead
SubContext.prototype.depends = function(file) {
  this.parse(file)
}
