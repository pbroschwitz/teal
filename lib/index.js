var path = require('path')
  , util = require('util')
  , exposed = require('exposed')
  , instant = require('instant')
  , stacked = require('stacked')
  , dirwatcher = require('dirwatcher')
  , parse = require('./parse')
  , html = require('./html')
  , css = require('./css')
  , browserify = require('./browserify')
  , cache = require('./cache')
  , sort = require('./sort')
  , Promise = require('Promise')
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

  this.html = html(this)
  this.browserify = browserify(this)

  this.processors = [
    this.css = css(this),
    this.html //TODO make this optional
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

Teal.prototype.watch = function() {
  if (this.watcher) this.watcher.stop()
  this.watcher = dirwatcher(this.opts.root, /(\.tl|base.css)$/)

  var teal = this
  this.watcher.on('steady', function() {
    teal.process(this.files())
  })
}

Teal.prototype.process = function(files) {
  var teal = this
    , root = this.opts.root
    , bases = []
    , mods = {}

  this.classes = {}
  this.libs = []

  function processAll(files) {
    return Promise.all(files.map(process))
  }

  function process(file) {
    if (Array.isArray(file)) return processAll(file)
    if (!file || mods[file]) return
    if (file in require.cache) require.cache[file] = undefined
    try {
      var ast = teal.parse(file)
      mods[file] = ast
      return Promise.all(ast.deps).then(processAll)
    }
    catch (err) {
      return Promise.reject(err)
    }
  }


  return processAll(files.filter(function(f) {
    if (path.extname(f) == '.css') bases.push(f)
    else return f.indexOf('/lib/') < root.length
  }))
  .then(function() {
    mods = sort(mods)
    teal.processors.forEach(function(p) {
      p.process(mods, bases)
    })
  })
  .catch(this.emit.bind(this, 'error'))
}

Teal.prototype.parse = cache(function(file) {
  var url = this.expose({ file: file }).url
  return parse({ file: file, url: url, teal: this })
})


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
