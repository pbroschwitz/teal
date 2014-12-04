var fs = require('fs')
var EventEmitter = require('events').EventEmitter
var path = require('path')
var util = require('util')

var debug = require('debug')('teal:html')
var xtend = require('xtend')

var resolver = require('../resolver')
var visitor = require('../visitor')

module.exports = Compiler

function Compiler(handler) {
  this.visitor = visitor(handler)
  this.code = {}
  this.prevCode = {}
  this.context = {}
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
  var f = ast.file

  // look for cached code
  var code = this.code[f]
  if (code) return code

  debug('generating code %s', f)

  // invalidate the cache
  var prev = this.invalidate(f)

  var helpers = {
    resolve: resolver(f)
  }

  var ctx = xtend(helpers, this.context)
  code = this.code[f] = this.visitor.visit(ast, ctx)

  if (code) this.emit('generate', f, code)

  // if the code has changed ...
  if (prev && prev != code) {
    // ... reload pages that contain matching elements
    var cls = ast.root && ast.root.class
    var q = cls ? { className: cls } : ''
    this.emit('change', q)
  }

  return code
}

Compiler.prototype.serialize = function(el) {
  return el.toString()
}
