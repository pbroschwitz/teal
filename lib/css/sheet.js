var stringify = require('css-stringify')
  , flatten = require('flatten')

module.exports = function(css, name, opts) {
  return new Sheet(css, name, opts)
}

function Sheet(css, name, opts) {
  if (!opts) opts = {}
  var debug = css.teal.opts.debug
  this.opts = opts
  this.css = css
  this.res = this.expose(name + '.css')
  this.map = debug && this.expose(name + '.css.map')
}

Sheet.prototype.expose = function(name) {
  return this.css.teal.expose({ path: '/' + name, pending: true })
}

Sheet.prototype.process = function(rules) {
  var media = this.opts['flatten-media']
  if (!media) return rules // return as-is

  function unwrap(rule) {
    if (rule.type != 'media') return rule
    if (~media.indexOf(rule.media)) return rule.rules
  }
  return flatten(rules.map(unwrap, this)).filter(Boolean)
}

Sheet.prototype.write = function(rules) {
  var ast = { stylesheet: { rules: this.process(rules) }}
  var s = stringify(ast, {
    compress: this.css.compress !== false,
    sourcemap: !!this.map
  })

  var out = { css: s.code || s }
  if (s.map) out.map = JSON.stringify(s.map)

  var url = this.res.url
  this.css.transforms.forEach(function(tr) { out = tr(out, url) })

  if (this.map) {
    this.map.update(out.map)
    out.css += '\n/*# sourceMappingURL=' + this.map.url + ' */'
  }

  this.res.update(out.css)
}
