var test = require('tap').test
var compile = require('../../lib/css/compile')
var prep = require('../../lib/prep')
var simplify = require('../util/simplify')
var teal = require('../util/teal-mock.js')
var ls = require('srls')

var root= __dirname + '/fixture'

var ctx = prep(root, { teal: teal })
var files = ls(root)

test('css/compile', function(t) {
  ctx(files).then(function(preped) {
    t.deepEqual(simplify(compile(preped.asts)), require('./rules'))
    t.end()
  })
  .catch(function(err) {
    console.log(err.stack)
    t.fail(err)
    t.end()
  })
})
