var path = require('path')
  , util = require('util')
  , exposed = require('exposed')
  , instant = require('instant')
  , stacked = require('stacked')
  , dirwatcher = require('dirwatcher')
  , parse = require('./parse')
  , prep = require('./prep')
  , html = require('./html')
  , css = require('./css')
  , browserify = require('./browserify')
  , cache = require('./cache')
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

  this.html = html(this)
  this.browserify = browserify(this)

  this.processors = [
    prep(this),
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
    console.log(err)
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
  this.queue = files
  var mods = {}
  try {
    for (var i = 0; i < this.queue.length; i++) {
      var file = this.queue[i]
      if (file in require.cache) require.cache[file] = undefined
      var ast = this.parse(file)
      if (ast.root) {
        this.enqueue(ast.deps)
        mods[file] = ast
      }
    }
    mods = sort(mods)
    this.processors.forEach(function(p) {
      p.process(mods)
    })
  }
  catch (err) {
    this.emit(err)
  }
}

Teal.prototype.parse = cache(function(file) {
  var ast = parse({ file: file, teal: this })
  ast.url = this.expose({ file: file }).url
  return ast
})

Teal.prototype.enqueue = function(file) {
  if (!file) throw Error()
  if (Array.isArray(file)) return file.forEach(this.enqueue, this)
  if (!~this.queue.indexOf(file)) {
    this.queue.push(file)
  }
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
