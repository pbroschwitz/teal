var EventEmitter = require('events').EventEmitter
var fs = require('fs')
var path = require('path')
var util = require('util')

var debug = require('debug')('teal:main')
var ls = require('srls')
var exposed = require('exposed')

var css = require('./css')
var html = require('./html')
var macros = require('./macros')
var prep = require('./prep')

module.exports = function(opts) {
  return new Teal(opts)
}

function Teal(opts) {

  opts = typeof opts == 'string' ? { root: opts } : (opts || {})

  this.root = opts.root || process.cwd()
  this.debug = opts.debug

  this.assets = exposed({ route: opts.assets || 'assets' })
  this.saveAssets = opts.saveAssets

  // re-emit change events for assets
  this.assets.on('change', this.emit.bind(this, 'change'))

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

  process.nextTick(this.init.bind(this))
}

util.inherits(Teal, EventEmitter)

Teal.prototype.macros = macros

Teal.prototype.use = function(fn, opts) {
  if (typeof fn == 'string') fn = require.main.require(fn)
  fn.apply(this, [this].concat(Array.prototype.slice.call(arguments, 1)))
  return this
}

Teal.prototype.init = function(onready) {
  if (this.ready) {
    if (onready) onready.call(this)
  }
  else {
    if (onready) this.once('ready', onready)
    this.emit('init')
    this.process()
  }
  return this
}

Teal.prototype.isTealFile = function(f) {
  return path.extname(f) == '.tl'
}

Teal.prototype.process = function(files, cb) {
  var rebuild = !files
  if (rebuild) {
    files = ls(this.root).filter(this.isTealFile)
    this.prep = prep(this.root, { teal: this })
  }
  debug('parsing %s files', files.length)

  this.emit('process', files)

  var self = this
  return this.prep(files).then(function(preped) {
    self.processors.forEach(function(p) {
      p.process(preped.asts, rebuild ? preped.asts : preped.modified)
    })

    debug('ready')
    this.ready = true
    self.emit('ready', preped.files)

    if (cb) cb(null, preped.files)
  })
  .catch(function(err) {
    self.emit('error', err)
    if (cb) cb(err)
  })
  .done()
}

Teal.prototype.expose = function(opts) {
  if (typeof opts == 'string') opts = { file: opts }
  if (opts.gzip === undefined) opts.gzip = 'content' in opts
  opts.root = this.opts.root
  var res = this.resources.expose(opts)
  this.emit('expose', res)
  return res
}
