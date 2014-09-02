var test = require('tap').test
var compile = require('../../lib/css/compile')
var prep = require('../../lib/prep')
var simplify = require('../util/simplify')
var ls = require('srls')

var root= __dirname + '/fixture'

var ctx = prep(root)
var files = ls(root)
var asts = ctx.all(files).map(simplify)

test('css/compile', function(t) {
  t.deepEqual(simplify(compile(asts)), require('./rules'))
  t.end()
})
