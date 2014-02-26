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
  this.watcher = dirwatcher(this.opts.root, '*.tl')

  var teal = this
  this.watcher.on('steady', function() {
    teal.process(this.files())
  })
}

Teal.prototype.process = function(files) {
  var teal = this
    , root = this.opts.root
    , mods = {}

  this.classes = {}

  var queue = files.filter(function(f) {
    return f.indexOf('/lib/') < root.length
  })

  function enqueue(file) {
    if (!file) throw Error()
    if (Array.isArray(file)) return file.forEach(enqueue)
    if (!~queue.indexOf(file)) {
      queue.push(file)
    }
  }

  var i = 0
  function next() {
    var file = queue[i++]
    if (!file) return done(null)
    if (file in require.cache) require.cache[file] = undefined
    var ast = teal.parse(file)
    mods[file] = ast
    Promise.all(ast.deps).then(enqueue).then(next)
  }

  function done() {
    mods = sort(mods)
    teal.processors.forEach(function(p) {
      p.process(mods)
    })
  }

  next()
}

Teal.prototype.parse = cache(function(file) {
  var url = this.expose({ file: file }).url
  var ast = parse({ file: file, url: url, teal: this })
  return ast
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
