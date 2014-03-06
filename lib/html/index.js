var visitor = require('../visitor')
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
  this.visit = visitor(dom(this))
  this.code = {}
  this.cache = {}

  var self = this
  this.engine = function(file, data, cb) {
    cb(null, self.render(file, data))
  }
}


HTML.prototype.loadModule = function(module, file) {
  module.exports = this.require(file)
}

HTML.prototype.require = function(file) {
  if (path.extname(file) != '.tl') return require(file)
  var mod = this.cache[file]
  if (!mod) {
    mod = this.cache[file] = this.load(file)
  }
  return mod
}

HTML.prototype.getCode = function(file) {
  var code = this.code[file]
  if (!code) throw new Error('No compiled code found for ' + file)
  return code
}

HTML.prototype.load = function(file) {
  var self = this
  var exports = {}
  var module = { exports: exports }
  var code = this.getCode(file)
  vm.runInNewContext(this.code[file], {
    document: dommy(),
    module: module,
    exports: exports,
    require: function(f) {
      var dir = path.dirname(file)
      return self.require(path.resolve(dir, f))
    }
  }, file + '.js')
  return module.exports
}

HTML.prototype.compile = function(ast) {
  this.cache[ast.file] = undefined
  require.cache[ast.file] = undefined
  return ast.root && (this.code[ast.file] = this.visit(ast))
}

HTML.prototype.process = function(ctx) {
  ctx.asts.forEach(this.compile, this)
}

HTML.prototype.render = function(file, data) {
  return this.require(file)(data).toString()
}
