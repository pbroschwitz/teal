var EventEmitter = require('events').EventEmitter
var util = require('util')
var xtend = require('xtend')

var resolver = require('../resolver')
var visitor = require('../visitor')

module.exports = function(handler) {
  return new Compiler(handler)
}

function Compiler(handler) {
  this.code = {}
  this.context = {}
  this.visitor = visitor(handler)
}

util.inherits(Compiler, EventEmitter)

Compiler.prototype.getCode = function(file) {
  var c = this.code[file]
  if (!c) throw new Error('No code found for ' + file)
  return c
}

Compiler.prototype.compile = function(file, ctx) {
  var c = this.code[file]
  if (c) return c
  var ast = ctx.parse(file)
  return this.generate(ast)
}

Compiler.prototype.generate = function(ast) {
  if (!ast.root || ast.root.type == 'mixin') return
  var ctx = xtend({ resolve: resolver(ast.file) }, this.context)
  var prev = this.code[ast.file]
  var code = this.code[ast.file] = this.visitor.visit(ast, ctx)
  if (prev && prev != code) this.emit('change', ast.root.class)
  return code
}

Compiler.prototype.serialize = function(el) {
  return el.toString()
}