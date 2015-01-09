var EventEmitter = require('events').EventEmitter
var fs = require('fs')
var path = require('path')
var util = require('util')

var debug = require('debug')('teal:main')
var ls = require('srls')
var exposed = require('exposed')
var mkdirp = require('mkdirp')

var css = require('./css')
var html = require('./html')
var macros = require('./macros')
var naming = require('./naming')
var prep = require('./prep')
var resolver = require('./resolver')

module.exports = function(opts) {
  return new Teal(opts)
}

function Teal(opts) {
  var self = this

  opts = typeof opts == 'string' ? { root: opts } : (opts || {})

  this.root = opts.root || process.cwd()
  this.resolve = resolver(null, this.root)

  this.debug = opts.debug

  this.saveAssets = opts.saveAssets
  this.assets = exposed({
    route: path.resolve('/', opts.assets || 'assets')
  })

  // re-emit change events for assets
  this.assets.on('change', function(res) {
    self.emit('change', { url: res.url })
  })

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

Teal.prototype.naming = naming

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
  var incremental = this.prep && files
  if (!incremental) {
    files = ls(this.root).filter(this.isTealFile)
    this.prep = prep(this.root, { teal: this })
  }
  debug('parsing %s files', files.length)

  this.emit('process', files)

  var self = this
  return this.prep(files).then(function(preped) {
    self.processors.forEach(function(p) {
      p.process(preped.asts, incremental ? preped.modified : preped.asts)
    })

    debug('ready')
    self.ready = true
    self.asts = preped.cache
    self.emit('ready', preped.files)

    if (cb) cb(null, preped.files)
  })
  .catch(function(err) {
    self.prep = null // perform full rebuild upon recovery
    self.emit('error', err)
    if (cb) cb(err)
  })
  .done()
}

Teal.prototype.expose = function(opts) {

  if (typeof opts == 'string') opts = { file: opts }
  if (opts.gzip === undefined) opts.gzip = 'content' in opts

  opts.root = this.root
  var res = this.assets.expose(opts)

  if (this.saveAssets) {
    var f = path.join(this.saveAssets, res.path)
    var dir = path.dirname(f)
    debug('Saving asset %s', f)
    mkdirp.sync(dir)
    res.createReadStream().pipe(fs.createWriteStream(f))
  }
  return res
}

Teal.prototype.render = function(file, data, cb) {
  return this.html.render(this.resolve(file), data, cb)
}

Teal.prototype.getClassName = function(file) {
  var f = this.resolve(file)
  var ast = this.asts && this.asts[f]
  return ast && ast.root && ast.root.class
}
