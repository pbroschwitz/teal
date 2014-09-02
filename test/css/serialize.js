var test = require('tap').test
var serialize = require('../../lib/css/serialize')

test('css/serialize', function(t) {
  var rules = require('./rules')
  var s = serialize(rules, { mapUrl: 'foo.css.map' })
  t.equal(s.css, '@keyframes fade{100%{opacity:0;}}.e-foo{background:teal;}.e-foo > h1{font-size:2em;}.l-bar{float:left;}\n/*# sourceMappingURL=foo.css.map */')
  t.end()
})
