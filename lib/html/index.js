var visitor = require('../visitor')
  , cache = require('../cache')
  , dom = require('./dom')
  , dommy = require('dommy')
  , path = require('path')
  , vm = require('vm')

module.exports = function(teal) {
  return new HTML(teal)
}

function HTML(teal) {
  this.teal = teal
  require.extensions['.tl'] = this.loadModule.bind(this)
  this.engine = this.render.bind(this)
  this.visit = visitor(dom(this))
}


HTML.prototype.loadModule = function(module, filename) {
  module.exports = this.require(filename)
}

HTML.prototype.require = function(filename) {
  if (path.extname(filename) != '.tl') return require(filename)
  return this.load(filename)
}

HTML.prototype.load = cache(function(filename) {
  var self = this
  var exports = {}
  var module = { exports: exports }
  vm.runInNewContext(this.compile(filename), {
    document: dommy(),
    module: module,
    exports: exports,
    require: function(f) {
      var dir = path.dirname(filename)
      return self.require(path.resolve(dir, f))
    }
  }, filename + '.js')
  return module.exports
})

HTML.prototype.compile = cache(function(file) {
  var ast = this.teal.parse(file)
  return this.visit(ast)
})

HTML.prototype.process = function(mods) {
  var teal = this.teal
    , self = this
  mods.forEach(function(ast) {
    var cls = ast.root.class
    var code = self.visit(ast) //cache?
    teal.expose({ file: ast.file + '.js', content: code, className: cls })
  })
}

HTML.prototype.render = function(file, data, cb) {
  var html = this.require(file)(data).toString()
  if (cb) cb(null, html)
  else return html
}