var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , list = require('./list')
  , detective = require('detective')
  , resolve = require('resolve')
  , parse = require('./parse')
  , EventEmitter = require('events').EventEmitter

module.exports = function(teal, files) {
  var ctx = new Context(teal)

  var i = ctx.root.lastIndexOf('/lib/')
  var topLevel = files.filter(function(f) {
    return f.lastIndexOf('/lib/') <= i
  })

  ctx.process(topLevel)
  teal.processors.forEach(function(p) {
    p.process(ctx)
  })
  ctx.emit('ready')
}

function Context(teal, files) {
  this.teal = teal
  this.macros = teal.macros
  this.root = teal.opts.root
  this.debug = teal.opts.debug
  this.asts = []
  this.libs = []
  this.bases = []
  this.processed = []
  this.classes = {}
  this.expose = teal.expose.bind(teal)
}

util.inherits(Context, EventEmitter)

Context.prototype.process = function(f) {
  if (Array.isArray(f)) return f.forEach(this.process, this)
  if (~this.processed.indexOf(f)) return

  this.processed.push(f)
  var method = 'process_' + path.extname(f).slice(1)
  if (this[method]) this[method](f)
}

Context.prototype.process_css = function(f) {
  if (path.basename(f) == 'base.css') this.bases.push(f)
}

Context.prototype.process_js = function(f) {
  var src = fs.readFileSync(f, 'utf8')
  var opts = {
    paths: require.main.paths,
    basedir: path.dirname(f)
  }
  detective(src).map(function(f) { return resolve.sync(f, opts) }).forEach(this.process, this)
}

Context.prototype.process_tl = function(f) {
  var src = fs.readFileSync(f, 'utf8')
  var url = this.debug && this.expose({ file: f, content: src }).url
  var ctx = new SubContext(this, f, url)
  var ast = parse(src, ctx)
  this.asts.push(ast)
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
  if (file[0] == '/') return path.join(this.root, file)
  return path.resolve(this.dir, file)
}

/**
 * Add a `position` object to `$$` that is compatible with the CSS ast.
 */
SubContext.prototype.pos = function($$, start, end) {
  $$.position = {
    file: this.file,
    source: this.url,
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
  return $$
}

SubContext.prototype.expand = function(node) {
  var macros = this.teal.macros
  if (node.name in macros) {
    try {
      return macros[node.name].apply(this, node.arguments)
    }
    catch (err) {
      err.stack = node.position + '\n' + err.stack
      throw err
    }
  }
}
