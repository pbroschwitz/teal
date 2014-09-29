var flatten = require('flatten')
var stringify = require('css-stringify')

module.exports = function(rules, opts) {

  if (!opts) opts = {}

  var media = opts['flatten-media'] || []

  function visit(rule) {
    if (rule.type == 'media') {
      if (rule.sheet) return rule.sheet == opts.name && rule.rules
      return ~media.indexOf(rule.media) ? rule.rules : rule
    }
    return rule
  }

  // filter `@sheet` blocks and optionally flatten `@media` rules
  rules = flatten(rules.map(visit)).filter(Boolean)

  // create a stringify-compatible structure
  var ast = {
    stylesheet: {
      rules: rules
    }
  }

  // stringify the AST
  var s = stringify(ast, {
    compress: opts.compress !== false,
    sourcemap: !!opts.mapUrl
  })

  // apply transforms
  var out = (opts.transforms || []).reduce(
    function(out, tr) {
      return tr(out, opts.url)
    },
    {
      css: s.code || s,
      map: s.map && JSON.stringify(s.map)
    }
  )

  if (opts.mapUrl) {
    // append the source-map URL
    out.css += '\n/*# sourceMappingURL=' + opts.mapUrl + ' */'
  }

  return out
}
