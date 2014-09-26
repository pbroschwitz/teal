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

  this.engine = function(file, data, cb) {
    process.nextTick(function() {
      cb(null, self.render(file, data))
    })
  }
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

HTML.prototype.generate = function(ast, ctx) {
  return this.js.visit(ast, ctx)
}

HTML.prototype.process = function(asts) {
  var html = this
  var ctx = {
    vars: scope()
  }
  this.cache = {}
  asts.forEach(function(ast) {
    if (!ast.root || ast.root.type == 'mixin') return
    require.cache[ast.file] = undefined
    var prev = html.code[ast.file]
    var code = html.code[ast.file] = html.generate(ast, ctx)
    if (prev && prev != code) html.teal.emit('change', ast.root.class)
  })
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
