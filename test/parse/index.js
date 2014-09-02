var path = require('path')
var test = require('tap').test
var ls = require('srls')
var parse = require('../../lib/parse')
var simplify = require('../util/simplify')

ls(__dirname).filter(function(f) {
  return path.extname(f) =='.tl'
})
.forEach(function(f) {
  var exp = require(f.replace('.tl', '.json'))
  var name = path.relative(__dirname, f)
  test('parse ' + name, function(t) {
    var ast = parse.file(f)
    var res = !name.match(/^doc/) ? ast.root : ast
    t.deepEqual(simplify(res), exp)
    t.end()
  })
})
