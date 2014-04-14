var fs = require('fs')
  , visitor = require('../visitor')
  , js = require('./js')
  , dommy = require('dommy')
  , path = require('path')
  , vm = require('vm')

module.exports = function(teal) {
  return new HTML(teal)
}

function HTML(teal) {
  this.teal = teal
  require.extensions['.tl'] = this.loadModule.bind(this)
  this.visit = visitor(js(this, __dirname + '/dom'))
  this.code = {}
  this.cache = {}

  var self = this
  this.engine = function(file, data, cb) {
    function render() {
      cb(null, self.render(file, data))
    }
    if (!self.code[file] && fs.existsSync(file)) {
      self.teal.once('ready', render).process()
    }
    else {
      process.nextTick(render)
    }
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
    console: console,
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
  var prev = this.code[ast.file]
  if (ast.root) {
    var code = this.code[ast.file] = this.visit(ast)
    if (prev && prev != code) this.teal.emit('change', ast.root.class)
    //console.log(ast.file, code)
    return code
  }
}

HTML.prototype.process = function(ctx) {
  ctx.asts.forEach(this.compile, this)
}

HTML.prototype.render = function(file, data) {
  var el = this.require(file)(data)
  var html = ''
  if (el.doctype) {
    html = '<!DOCTYPE ' + el.doctype + '>'
    el = el.root
  }
  html += el.toString()
  return html
}
