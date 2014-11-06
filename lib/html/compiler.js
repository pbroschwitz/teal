var EventEmitter = require('events').EventEmitter
var path = require('path')
var util = require('util')

var debug = require('debug')('teal:html')
var xtend = require('xtend')

var resolver = require('../resolver')
var visitor = require('../visitor')

module.exports = Compiler

function Compiler(handler) {
  this.code = {}
  this.prevCode = {}
  this.context = {}
  this.visitor = visitor(handler)
}

util.inherits(Compiler, EventEmitter)

Compiler.prototype.getCode = function(file) {
  var c = this.code[file]
  if (!c) throw new Error('No code found for ' + file)
  return c
}

Compiler.prototype.invalidate = function(f) {
  if (Array.isArray(f)) return f.map(this.invalidate, this)
  if (!this.code[f]) return this.prevCode[f]
  var prev = this.prevCode[f] = this.code[f]
  this.code[f] = undefined
  return prev
}

Compiler.prototype.compile = function(file, ctx) {
  var c = this.code[file]
  if (c) return c
  var ast = ctx.parse(file)
  return this.generate(ast)
}

Compiler.prototype.generate = function(ast) {
  debug('generating code %s', ast.file)
  if (!ast.root || ast.root.type == 'mixin') return
  var prev = this.invalidate(ast.file)
  var helpers = {
    resolve: resolver(ast.file),
    relative: function(f) {
      return path.relative(path.dirname(ast.file), f)
    }
  }
  var ctx = xtend(helpers, this.context)
  var code = this.code[ast.file] = this.visitor.visit(ast, ctx)
  if (prev && prev != code) this.emit('change', ast.root.class)
  return code
}

Compiler.prototype.serialize = function(el) {
  return el.toString()
}
