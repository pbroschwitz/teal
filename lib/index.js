var EventEmitter = require('events').EventEmitter
var fs = require('fs')
var path = require('path')
var util = require('util')

var ls = require('srls')
var exposed = require('exposed')
var stacked = require('stacked')
var xtend = require('xtend')

var css = require('./css')
var html = require('./html')
var macros = require('./macros')
var prep = require('./prep')

module.exports = function(opts) {

  function tl(req, res, next) {
    if (!tl.initialized) tl.init(req.app)
    tl.handle(req, res, next)
  }

  // build the prototype chain
  var pt = xtend({}, Function.prototype)
  pt.__proto__ = Teal.prototype
  tl.__proto__ = pt

  // invoke the constructer using the tl-function as `this`
  Teal.call(tl, opts)

  return tl
}

function Teal(opts) {
  opts = typeof opts == 'string' ? { root: opts } : (opts || {})
  if (!opts.root) opts.root = process.cwd()
  if (!opts.route) opts.route = '/assets'

  this.opts = opts
  this.resources = exposed({ route: opts.route })
  this.handle = stacked().mount(opts.route, this.resources)
  this.statics = opts.statics || {}

  this.processors = [
    this.html = html(this),
    this.css = css(this)
  ]

  this.on('error', function(err) {
    if (err.location) console.error(err.location)
    if (opts.throwOnError) throw err
    if (err.name == 'SyntaxError') console.error(err.message)
    else console.error(err.stack || err)
  })
}

util.inherits(Teal, EventEmitter)

Teal.prototype.macros = macros

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
    this.prep = prep(this.opts.root, { teal: this })
    this.emit('init')
    this.initialized = true
    this.process()
  }
  return this
}

Teal.prototype.process = function(files) {

  if (!files) files = ls(this.opts.root).filter(function(f) {
    return path.extname(f) == '.tl'
  })

  this.emit('process', files)

  try {
    var asts = this.prep.all(files)
    this.processors.forEach(function(p) {
      p.process(asts)
    })
    this.emit('ready', asts)
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
