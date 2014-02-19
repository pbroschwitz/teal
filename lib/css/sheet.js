var stringify = require('css').stringify
  , rework = require('rework')
  , expose = require('./expose')
  , autoprefixer = require('autoprefixer')
  , Rework = rework('').constructor

module.exports = function(css, name, opts) {
  return new Sheet(css, name, opts)
}

function Sheet(css, name, opts) {
  if (!opts) opts = {}
  this.css = css
  this.plugins = [expose(css.teal)].concat(css.reworkPlugins).filter(Boolean)

  var ap = css.autoprefix
  if (ap !== false) {
    var args = ap ? ap.split(/\s*,\s*/) : []
    this.plugins.push(autoprefixer.apply(this, args).rework)
  }

  this.res = this.expose(name + '.css')
  this.map = this.expose(name + '.css.map')
}

Sheet.prototype.expose = function(name) {
  var teal = this.css.teal
  var res = teal.expose({ path: '/' + name, content: undefined })
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
  var s = stringify(this.rework(rules), {
    compress: this.css.compress !== false,
    sourcemap: true
  })
  if (this.css.sourcemap !== false) {
    this.map.write(JSON.stringify(s.map))
    s.code += '\n/*# sourceMappingURL=' + this.map.url + ' */'
  }
  this.res.write(s.code)
}
