var path = require('path')
  , util = require('util')
  , exposed = require('exposed')
  , instant = require('instant')
  , stacked = require('stacked')
  , dirwatcher = require('dirwatcher')
  , parse = require('./parse')
  , html = require('./html')
  , css = require('./css')
  , cache = require('./cache')
  , loader = require('./loader')
  , tealify = require('./tealify')
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
  this.transforms = [
    tealify(this)
  ]
  this.imports = []
  if (opts.normalize !== false) {
    this.imports.push(__dirname + '/css/normalize.css')
  }

  this.classMap = {}
  var live = instant()
  this.resources = exposed({ route: opts.route }).on('change', function(res) {
    var cls = teal.classMap[res.url]
    if (cls) live.reload({ className: cls }) //TODO check mtime
    else live.reload(res.url)
  })

  this.handle = stacked().use(live).mount(opts.route, this.resources)

  this.sheets = [css.sheet(this, 'main')]


  this.engine = function(file, data, cb) {
    var fn = teal.require(file)
    cb(null, fn(data).toString())
  }

  this.css = css(this)
  this.html = html(this)
  this.html.register()
  cache.method(this, 'parse')

  this.require = loader('.tl', this.html.compile)

}

util.inherits(Teal, EventEmitter)

Teal.prototype.init = function() {
  if (!this.initialized) {
    this.process(this.opts.root)
    this.initialized = true
  }
  return this
}

Teal.prototype.process = function(dir) {
  this.opts.root = dir //TODO
  if (this.watcher) this.watcher.stop()
  this.watcher = dirwatcher(dir, '*.tl')

  var teal = this
  this.watcher.on('steady', function() {
    teal.queue = this.files()
    teal.emit('start')
    try {
      for (var i = 0; i < teal.queue.length; i++) {
        var file = teal.queue[i]
        var url = teal.expose({ file: file }) //if dev
        var ast = teal.parse(file)
        teal.enqueue(ast.deps)
        teal.emit('file', file, ast, url)
      }
    }
    catch (err) {
      console.log(err)
    }
    teal.emit('end')
  })
}

Teal.prototype.parse = function(file) {
  return parse({ file: file, teal: this })
}

Teal.prototype.render = function(name, data) {
  var file = path.resolve(this.opts.root, './' + name) + '.tl'
  return this.require(file)(data)
}

Teal.prototype.enqueue = function(file) {
  if (Array.isArray(file)) return file.forEach(this.enqueue, this)
  if (!~this.queue.indexOf(file)) {
    this.queue.push(file)
  }
}

Teal.prototype.getClassName = function(file) {
  return file.replace(this.opts.root, '')
    .replace(/\//g, '-')
    .replace(/^-/, '')
    .replace(/\..+$/, '')
}

Teal.prototype.sheet = function(sheet) {
  this.sheets.push(sheet)
}

Teal.prototype.rework = function(fn) {
  this.reworkPlugins.push(fn)
}

Teal.prototype.transform = function(fn) {
  this.transforms.push(fn)
}

Teal.prototype.import = function(file) {
  if (!~this.imports.indexOf(file)) this.imports.push(file)
}

Teal.prototype.set = function(key, value) {
  this.opts[key] = value
  return this
}

Teal.prototype.write = function(dir) {
  //todo
}

Teal.prototype.expose = function(opts) {
  if (typeof opts == 'string') opts = { file: opts }
  if (opts.gzip === undefined) opts.gzip = 'content' in opts
  opts.root = this.opts.root
  var res = this.resources.expose(opts)
  if (opts.className) this.classMap[res.url] = opts.className
  return res
}
