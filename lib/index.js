var EventEmitter = require('events').EventEmitter
var fs = require('fs')
var path = require('path')
var util = require('util')

var debug = require('debug')('teal:main')
var ls = require('srls')
var exposed = require('exposed')
var stacked = require('stacked')

var css = require('./css')
var html = require('./html')
var macros = require('./macros')
var prep = require('./prep')

module.exports = function(opts) {
  return new Teal(opts)
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
  fn.apply(this, [this].concat(Array.prototype.slice.call(arguments, 1)))
  return this
}

Teal.prototype.init = function() {
  if (!this.initialized) {
    this.prep = prep(this.opts.root, { teal: this })
    this.emit('init')
    this.initialized = true
    this.process()
  }
  return this
}

Teal.prototype.process = function(files) {
  if (!files) files = ls(this.opts.root)
  debug('parsing %s files', files.length)

  this.emit('process', files)

  var self = this
  return this.prep(files).then(function(preped) {
    //debug('processing %s ASTs', preped.asts.length)
    self.processors.forEach(function(p) {
      p.process(preped.asts, preped.modified)
    })
    debug('ready')
    self.emit('ready', preped.files)
  })
  .catch(function(err) {
    self.emit('error', err)
  })
  .done()
}

Teal.prototype.expose = function(opts) {
  if (typeof opts == 'string') opts = { file: opts }
  if (opts.gzip === undefined) opts.gzip = 'content' in opts
  opts.root = this.opts.root
  return this.resources.expose(opts)
}
