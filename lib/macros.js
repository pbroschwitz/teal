var fs = require('fs')
  , mime = require('mime')

/**
 * This macro merely exists to allow the evaluation of arguments (like other
 * functions or variables).
 */
exports.url = function(s) {
  return 'url("' + s + '")'
}

/**
 * format() as used in @font-face. The argument must be a (quoted) string in
 * Firefox even if it is a valid identifier.
 */
exports.format = function(s) {
  return 'format("' + s + '")'
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

exports.inline = function(f) {
  return exports.data(mime.lookup(f), exports.read.call(this, f))
}

exports.stylesheet = function(name, opts) {
  if (!name) name = 'main'
  if (!opts) opts = {}
  if (!opts.sheets) opts.sheets = ['default']
  if (!Array.isArray(opts.sheets)) opts.sheets = [opts.sheets]

  var href = this.teal.css.sheet(name, opts)

  var link = { type: 'element', tag: 'link', declarations: [
    { type: 'attribute', name: 'href', value: href },
    { type: 'attribute', name: 'rel', value: 'stylesheet' }
  ]}

  if (!opts.if) return link

  var cond = '[if ' + opts.if + ']>'
  var end = '<![endif]'
  if (opts['ie-only']) {
    link = '<link href="'+ href +'" rel="stylesheet">'
    return { type: 'comment', text: cond + link + end }
  }
  return [
    { type: 'comment', text: cond }, link, { type: 'comment', text: end }
  ]
}

exports.comment = function(text) {
  return { type: 'comment', text: text }
}

exports.html = function(html) {
  return { type: 'html', html: html }
}
