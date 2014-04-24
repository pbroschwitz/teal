var fs = require('fs')

/**
 * Creates elements to link the stylesheet(s).
 */
exports.stylesheets = function() {
  return this.teal.css.sheets.map(function(sheet) {
    if (sheet.cc) return { type: 'comment', text: '...' }
    return { type: 'element', tag: 'link', declarations: [
      { type: 'attribute', name: 'rel', value: 'stylesheet' },
      { type: 'attribute', name: 'href', value: sheet.res.url },
    ]}
  })
}

/**
 * Returns an URL for the given file.
 */
exports.url = function(file) {
  if (~file.indexOf('//') || ~file.indexOf(':')) return 'url("' + file + '")'
  return this.expose(this.resolve(file)).url
}

/**
 * Reads the content of the given file.
 */
exports.read = function(file) {
  return fs.readFileSync(this.resolve(file), 'utf8')
}


exports.placeholder = function(w, h, opts) {
  if (!opts) opts = {}
  return 'data:image/svg+xml;base64,' + new Buffer((
    '<svg width="$W" height="$H" viewBox="0 0 $W $H" preserveAspectRatio="none" '
    + 'xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M0,0L$W,0L$W,$HL0,$HL0,0L$W,$HM0,$HL$W,0" '
    + 'fill="$B" stroke="$F" /></svg>')
    .replace(/\$W/g, w)
    .replace(/\$H/g, h)
    .replace(/\$F/g, opts.fg || '#999')
    .replace(/\$B/g, opts.bg || '#ddd')
    )
    .toString('base64')
}


exports.svgpath = function(p, opts) {
  if (!opts) opts = {}
  console.log(opts)
  return 'data:image/svg+xml;base64,' + new Buffer((
    '<svg width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none" '
    + 'xmlns="http://www.w3.org/2000/svg">'
    + '<path d="$P" '
    + 'fill="$F" stroke="$S" /></svg>')
    .replace(/\$P/g, p)
    .replace(/\$S/g, opts.stroke || 'none')
    .replace(/\$F/g, opts.fill || '#fff')
    )
    .toString('base64')
}
