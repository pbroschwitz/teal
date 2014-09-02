var test = require('tap').test
var path = require('path')
var fs = require('fs')
var ls = require('srls')
var teal = require('../../lib')

var root = __dirname + '/fixture'

var tl = teal({ root: root })
tl.init()

var files = ls(root).forEach(function(f) {
  if (path.extname(f) != '.html') return
  var exp = fs.readFileSync(f, 'utf8').trim()
  test(path.basename(f), function(t) {
    var html = tl.html.render(f.replace('.html', '.tl'), {})
    t.equal(decode(html), exp)
    t.end()
  })
})

function decode(s) {
  return s //s.replace(/&#x2f;/g, '/')
}
