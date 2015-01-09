var fs = require('fs')

var calc = require('reduce-css-calc')
var color = require('css-color-function').convert
var mime = require('mime')
var min = require('csscolormin').min

exports.const = function(name) {
  var v = this.consts[name]
  if (v === undefined) throw new Error('No such const: ' + name)
  return v
}

exports.param = function(arg) {
  if (!this.params) throw new Error('param() is only supported in mixins')
  var args = /(\S+)\s*(.*)/.exec(arg)
  var name = args[1]
  var v = this.params[name]
  return v !== undefined ? v : args[2]
}

exports.calc = function(exp) {
  return calc('calc('+ exp +')')
}

exports.color = function(exp) {
  return min(color('color('+ exp +')'))
}

/**
 * Returns an URL for the given file.
 */
exports.src = function(file) {
  if (~file.indexOf('//') || ~file.indexOf(':')) return file
  return this.teal.expose(this.resolve(file)).url
}

/**
 * Reads the content of the given file.
 */
exports.read = function(file) {
  return fs.readFileSync(this.resolve(file), 'utf8')
}

exports.inline = function(file) {
  var s = exports.read.call(this, file)
  return 'data:' + mime.lookup(file)
    + ';base64,' + new Buffer(s).toString('base64')
}
