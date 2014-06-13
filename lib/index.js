var fs = require('fs')
  , path = require('path')
  , readdirrsync = require('readdirrsync')
  , util = require('util')
  , exposed = require('exposed')
  , stacked = require('stacked')
  , compile = require('./compile')
  , html = require('./html')
  , css = require('./css')
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
  this.builtInGlobals = {}

  this.resources = exposed({ route: opts.route })
  this.handle = stacked().mount(opts.route, this.resources)

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
    if (err.location) console.error(err.location)
    if (err.name == 'SyntaxError') console.error(err.message)
    else console.error(err.stack || err)
  })
}

util.inherits(Teal, EventEmitter)

Teal.prototype.use = function(fn, opts) {
  if (typeof fn == 'string') fn = require.main.require(fn)
  fn(this, opts || {})
  return this
}

Teal.prototype.init = function() {
  if (!this.initialized) {
    this.emit('init')
    this.process()
    this.initialized = true
  }
  return this
}

Teal.prototype.process = function(files) {
  if (!files) files = readdirrsync(this.opts.root).reverse()
  this.emit('process', files)
  try {
    var processed = compile(this, files)
    this.emit('ready', processed)
  }
  catch (err) {
    this.emit('error', err)
  }
}

Teal.prototype.set = function(key, value) {
  this.opts[key] = value
  return this
}

Teal.prototype.expose = function(opts) {
  if (typeof opts == 'string') opts = { file: opts }
  if (opts.gzip === undefined) opts.gzip = 'content' in opts
  opts.root = this.opts.root
  return this.resources.expose(opts)
}
