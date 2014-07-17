var fs = require('fs')
  , path = require('path')
  , ls = require('./util/ls')
  , util = require('util')
  , exposed = require('exposed')
  , funstance = require('funstance')
  , stacked = require('stacked')
  , compile = require('./compile')
  , prep = require('./prep')
  , html = require('./html')
  , css = require('./css')
  , EventEmitter = require('events').EventEmitter


module.exports = function(opts) {
  var tl = new Teal(opts)
  return funstance(tl, function(req, res, next) {
    if (!tl.initialized) tl.init(req.app)
    tl.handle(req, res, next)
  })
}

function Teal(opts) {
  opts = typeof opts == 'string' ? { root: opts } : (opts || {})
  if (!opts.root) opts.root = process.cwd()
  if (!opts.route) opts.route = '/assets'

  this.opts = opts
  this.resources = exposed({ route: opts.route })
  this.handle = stacked().mount(opts.route, this.resources)

  this.processors = [
    prep(this),
    this.html = html(this),
    this.css = css(this)
  ]

  this.on('error', function(err) {
    if (err.location) console.error(err.location)
    if (err.name == 'SyntaxError') console.error(err.message)
    else console.error(err.stack || err)
  })
}

util.inherits(Teal, EventEmitter)

Teal.prototype.macros = require('./macros')

Teal.prototype.use = function(fn, opts) {
  if (typeof fn == 'string') fn = require.main.require(fn)
  fn(this, opts || {})
  return this
}

Teal.prototype.init = function(app) {
  if (!this.initialized) {
    if (app) {
      this.opts.root = app.get('views')
      app.engine('tl', this.html.engine)
      app.set('view engine', 'tl')
    }
    this.emit('init')
    this.process()
    this.initialized = true
  }
  return this
}

Teal.prototype.process = function(files) {
  if (!files) files = ls(this.opts.root)
  this.emit('process', files)
  try {
    var processed = compile(this, files)
    this.emit('ready', processed)
  }
  catch (err) {
    this.emit('error', err)
  }
}

Teal.prototype.expose = function(opts) {
  if (typeof opts == 'string') opts = { file: opts }
  if (opts.gzip === undefined) opts.gzip = 'content' in opts
  opts.root = this.opts.root
  return this.resources.expose(opts)
}
