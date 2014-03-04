var fs = require('fs')
  , path = require('path')
  , util = require('util')
  , exposed = require('exposed')
  , instant = require('instant')
  , stacked = require('stacked')
  , dirwatcher = require('dirwatcher')
  , parse = require('./parse')
  , compile = require('./compile')
  , macros = require('./macros')
  , html = require('./html')
  , css = require('./css')
  , list = require('./list')
  , sort = require('./sort')
  , EventEmitter = require('events').EventEmitter


module.exports = function(opts) {
  return new Teal(opts)
}

function Teal(opts) {
  var teal = this
  opts = typeof opts == 'string' ? { root: opts } : (opts || {})
  if (!opts.root) opts.root = process.cwd()
  if (!opts.route) opts.route = '/assets'
  this.opts = opts


  this.classMap = {}
  var live = instant()
  this.resources = exposed({ route: opts.route }).on('change', function(res) {
    var cls = teal.classMap[res.url]
    if (cls) live.reload({ className: cls }) //TODO check mtime
    else live.reload(res.url)
  })

  this.handle = stacked().use(live).mount(opts.route, this.resources)

  this.processors = [
    this.html = html(this),
    this.css = css(this)
  ]

  this.on('mount', function(app) {
    this.opts.root = app.get('views')
    app.engine('tl', this.html.engine)
    app.set('view engine', 'tl')
    this.init()
  })

  this.on('error', function(err) {
    console.log(err.stack)
  })
}

util.inherits(Teal, EventEmitter)

Teal.prototype.init = function() {
  if (!this.initialized) {
    this.watch()
    this.initialized = true
  }
  return this
}

//TODO Add API to register macros
Teal.prototype.macros = macros

Teal.prototype.watch = function() {
  if (this.watcher) this.watcher.stop()
  this.watcher = dirwatcher(this.opts.root, /(\.tl|base.css)$/)

  var teal = this
  this.watcher.on('steady', function() {
    teal.process(this.files())
  })
}

Teal.prototype.process = function(files) {
  compile(this, files)
}


Teal.prototype.set = function(key, value) {
  this.opts[key] = value
  return this
}

Teal.prototype.expose = function(opts) {
  if (typeof opts == 'string') opts = { file: opts }
  if (opts.gzip === undefined) opts.gzip = 'content' in opts
  opts.root = this.opts.root
  var res = this.resources.expose(opts)
  if (opts.className) this.classMap[res.url] = opts.className
  return res
}
