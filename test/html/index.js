var fs = require('fs')
var path = require('path')
var ls = require('srls')
var teal = require('../../lib')
var test = require('tap').test

var settings = __dirname + '/settings.tl'

var data = {}

var files = ls(__dirname).filter(function(f) {
  return path.extname(f) =='.html'
})

function template(f) {
  return f.replace('.html', '.tl')
}

test('html', function(t) {
  var tl = teal({ root: __dirname, throwOnError: true })
  tl.init()

  tl.on('ready', function() {

    files.forEach(function(f) {

      t.test('html/' + path.basename(f), function(t) {
        var exp = fs.readFileSync(f, 'utf8').trim()
        var html = tl.html.render(template(f), data)
        t.deepEqual(html.replace(/&#x2f;/g, '/'), exp)
        t.end()
      })
    })
    t.end()
  })

})
