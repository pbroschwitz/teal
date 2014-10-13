var path = require('path')
var vm = require('vm')

var dommy = require('dommy')

var js = require('./js')
var scope = require('../scope')

module.exports = function(teal) {
  return new HTML(teal)
}

function HTML(teal) {
  this.teal = teal
  this.code = {}
  this.cache = {}
  var self = this
  this.js = js(this)

  require.extensions['.tl'] = function(module, file) {
    module.exports = self.load(file)
  }
}

HTML.prototype.runtime = __dirname + '/dom'

HTML.prototype.getCode = function(file) {
  var c = this.code[file]
  if (!c) throw new Error('No code found for ' + file)
  return c
}

HTML.prototype.compile = function(file, ctx) {
  var c = this.code[file]
  if (c) return c
  var ast = ctx.parse(file)
  return this.generate(ast)
}

HTML.prototype.generate = function(ast) {
  if (!ast.root || ast.root.type == 'mixin') return
  require.cache[ast.file] = undefined
  var prev = this.code[ast.file]
  var code = this.code[ast.file] = this.js.visit(ast)
  if (prev && prev != code) this.teal.emit('change', ast.root.class)
  return code
}

HTML.prototype.process = function(asts) {
  var html = this
  this.cache = {}
  asts.forEach(this.generate, this)
}

HTML.prototype.load = function(file) {
  if (file.slice(-3) != '.tl') return require.main.require(file)
  var self = this
  var mod = this.cache[file]
  if (!mod) {
    var dir = path.dirname(file)
    var exports = {}
    var module = { exports: exports }
    var code = self.getCode(file)
    //console.log(file, code)
    vm.runInNewContext(code, {
      document: dommy(),
      console: console,
      module: module,
      exports: exports,
      require: function(f) {
        return self.load(f) //path.resolve(dir, f))
      }
    }, file + '.js')
    mod = self.cache[file] = module.exports
  }
  return mod
}

HTML.prototype.render = function(file, data) {
  var el = this.load(file)(data)
  var html = ''
  if (el.doctype) {
    html = '<!DOCTYPE ' + el.doctype + '>'
    el = el.root
  }
  html += el.toString()
  return html
}
