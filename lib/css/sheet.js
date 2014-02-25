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
  this.plugins = [expose(css.teal)]
  this.res = this.expose(name + '.css')
  this.map = this.expose(name + '.css.map')
}

Sheet.prototype.expose = function(name) {
  return this.css.teal.expose({ path: '/' + name, pending: true })
}

Sheet.prototype.write = function(rules) {

  var rw = new Rework({ stylesheet: { rules: rules }})
  this.plugins.forEach(rw.use, rw)
  this.css.plugins.forEach(rw.use, rw)

  var ap = this.css.autoprefix
  if (ap !== false) {
    var args = ap ? ap.split(/\s*,\s*/) : []
    rw.use(autoprefixer.apply(this, args).rework)
  }

  var s = stringify(rw.obj, {
    compress: this.css.compress !== false,
    sourcemap: true
  })

  if (this.css.sourcemap !== false) {
    this.map.update(JSON.stringify(s.map))
    s.code += '\n/*# sourceMappingURL=' + this.map.url + ' */'
  }
  this.res.update(s.code)
}
