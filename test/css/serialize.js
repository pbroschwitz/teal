var test = require('tap').test
var serialize = require('../../lib/css/serialize')
var read = require('../util/read')

test('css/serialize', function(t) {
  var rules = require('./rules')
  var s = serialize(rules, { mapUrl: 'foo.css.map' })
  t.equal(s.css, read(__dirname + '/out.css'))
  t.end()
})
