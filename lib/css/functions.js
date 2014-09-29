var fs = require('fs')

var calc = require('reduce-css-calc')
var color = require('css-color-function').convert
var mime = require('mime')
var min = require('csscolormin').min

var unquote = require('../util/unquote')

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
  file = unquote(file)
  if (~file.indexOf('//') || ~file.indexOf(':')) return file
  return this.teal.expose(this.resolve(file)).url
}

/**
 * Reads the content of the given file.
 */
exports.read = function(file) {
  return fs.readFileSync(this.resolve(unquote(file)), 'utf8')
}

exports.inline = function(f) {
  var s = exports.read.call(this, f)
  return 'data:'+mime.lookup(f)+';base64,' + new Buffer(s).toString('base64')
}
