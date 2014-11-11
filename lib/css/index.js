var debug = require('debug')('teal:css')
var xtend = require('xtend')

var compile = require('./compile')
var functions = require('./functions')
var serialize = require('./serialize')

module.exports = function(teal) {
  return new CSS(teal)
}

function CSS(teal) {
  this.teal = teal
  this.transforms = []

  var self = this
  teal.on('process', function() {
    // The sheets are created inside the .tl files via the stylesheet() marcro.
    // Hence we have to reset the array before each processing pass.
    self.sheets = []
  })
}

CSS.prototype.functions = functions

CSS.prototype.expose = function(name) {
  return this.teal.expose({ path: '/' + name, pending: true })
}

CSS.prototype.sheet = function(name, opts) {
  if (!opts) opts = {}
  var css = this.expose(name + '.css')
  var map = opts.debug && this.expose(name + '.css.map')

  opts = xtend(opts, {
    url: css.url,
    mapUrl: map && map.url,
    transforms: this.transforms
  })

  this.sheets.push(function(rules) {
    var s = serialize(rules, opts)
    css.update(s.css)
    if (map) map.update(s.map)
  })

  return css.url
}

CSS.prototype.transform = function(fn) {
  this.transforms.push(fn)
  return this.teal
}

CSS.prototype.process = function(asts) {
  debug('generating CSS for %s ASTs', asts.length)
  if (!this.sheets.length) this.sheet('main')

  var rules = compile(asts)

  this.sheets.forEach(function(sheet) {
    sheet(rules)
  })
  debug('generated %s stylesheet(s)', this.sheets.length)
}
