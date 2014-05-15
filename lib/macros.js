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
  return 'url("' + exports.src.call(this, file) + '")'
}

/**
 * Returns an URL for the given file.
 */
exports.src = function(file) {
  if (~file.indexOf('//') || ~file.indexOf(':')) return file
  return this.expose(this.resolve(file)).url
}


/**
 * Reads the content of the given file.
 */
exports.read = function(file) {
  return fs.readFileSync(this.resolve(file), 'utf8')
}


exports.data = function(mime, s) {
  return 'data:'+mime+';base64,' + new Buffer(s).toString('base64')
}

exports.placeholder = function(w, h, opts) {
  if (!opts) opts = {}
  return exports.data('image/svg+xml',
    ('<svg width="$W" height="$H" viewBox="0 0 $W $H" preserveAspectRatio="none" '
    + 'style="background:$B" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M0,0L$W,$HM0,$HL$W,0" stroke="$F" /></svg>')
    .replace(/\$W/g, w)
    .replace(/\$H/g, h)
    .replace(/\$F/g, opts.fg || '#999')
    .replace(/\$B/g, opts.bg || '#ddd')
  )
}


exports.svgpath = function(p, opts) {
  if (!opts) opts = {}
  return exports.data('image/svg+xml',
    ('<svg width="$W" height="$H" viewBox="0 0 $W $H" preserveAspectRatio="$A" '
    + 'xmlns="http://www.w3.org/2000/svg">'
    + '<path d="$P" '
    + 'fill="$F" stroke="$S" /></svg>')
    .replace(/\$P/, p)
    .replace(/\$W/g, opts.width || 100)
    .replace(/\$H/g, opts.height || 100)
    .replace(/\$A/, opts.aspect || 'none')
    .replace(/\$S/, opts.stroke || 'none')
    .replace(/\$F/, opts.fill || '#ddd')
  )
}
