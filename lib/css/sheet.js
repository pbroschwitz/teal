var css = require('css')
  , rework = require('rework')
  , expose = require('./expose')
  , clearfix = require('rework-clearfix')
  , autoprefixer = require('autoprefixer')
  , Rework = rework('').constructor

module.exports = function(teal, name, opts) {
  return new Sheet(teal, name, opts)
}

function Sheet(teal, name, opts) {
  if (!opts) opts = {}
  this.teal = teal
  this.opts = opts
  this.plugins = [expose(teal), clearfix] //teal.reworkPlugins

  var ap = opts.autoprefix
  if (ap !== false) {
    var args = ap ? ap.split(/\s*,\s*/) : []
    this.plugins.push(autoprefixer.apply(this, args).rework)
  }

  this.res = this.expose(name + '.css')
  if (opts.sourcemap) this.map = this.expose(name + '.css.map')
}

Sheet.prototype.expose = function(name) {
  var teal = this.teal
  res = teal.expose({ path: '/' + name, content: undefined })
  res.write = function(s) {
    teal.expose({ path: '/' + name, content: s })
  }
  return res
}

Sheet.prototype.rework = function(rules) {
  var rw = new Rework({ stylesheet: { rules: rules }})
  this.plugins.forEach(rw.use, rw)
  return rw.obj
}

Sheet.prototype.write = function(rules) {
  var s = css.stringify(this.rework(rules), { compress: true, sourcemap: true })
  if (this.map) {
    this.map.write(JSON.stringify(s.map))
    s.code += '\n/*# sourceMappingURL=' + this.map.url + ' */'
  }
  this.res.write(s.code)
}
