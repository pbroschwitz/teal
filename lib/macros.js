var fs = require('fs')

var mime = require('mime')

var unquote = require('./util/unquote')

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


exports.data = function(mime, s) {
  return 'data:'+mime+';base64,' + new Buffer(s).toString('base64')
}

exports.inline = function(f) {
  return exports.data(mime.lookup(f), exports.read.call(this, f))
}

exports.stylesheet = function(opts) {
  if (!opts) opts = {}
  if (!opts.sheets) opts.sheets = ['default']
  if (!Array.isArray(opts.sheets)) opts.sheets = [opts.sheets]

  var href = this.teal.css.sheet(opts.name || 'main', opts)
  var link = this.el('link', { rel: 'stylesheet', href: href })
  if (!opts.if) return link
  var  type = opts['ie-only'] ? 'cc' : 'rcc'
  return exports[type](opts.if, link)
}

/**
 * Creates a HTML comment.
 */
exports.comment = function(text) {
  return { type: 'comment', text: text }
}

/**
 * Conditional comment that is only visible to IEs that match `cond` and
 * support this feature (< IE 10).
 */
exports.cc = function(cond, content) {
  var text = exports.serialize([
    exports.injectHTML('[if ' + cond + ']>'),
    content,
    exports.injectHTML('<![endif]')
  ])
  return { type: 'comment', text: text }
}

/**
 * Revealed conditional comment that is visible to browsers that don't support
 * conditional comments..
 * http://msdn.microsoft.com/en-us/library/ms537512(v=vs.85).aspx#dlrevealed
 */
exports.rcc = function(cond, content) {
  return [
    { type: 'comment', text: '[if ' + cond + ']>' },
    content,
    { type: 'comment', text: '<![endif]' }
  ]
}

/**
 * Dangerously injects raw HTML. Use with caution!
 */
exports.html = function(html) {
  return { type: 'html', html: html }
}

/**
 * Serializes the given content to HTML. Used internally to create conditional
 * comments but could be used for other purposes too.
 */
exports.serialize = function(content) {
  return { type: 'serialize', content: content }
}
