var fs = require('fs')
  , should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  var root = path.join(__dirname, 'fixture', 'views')
  var el = path.join(root, 'el')
  var tl = teal()
  var data = {
    names: [
      { first: 'Felix' },
      { first: 'Malte' }
    ]
  }
  var files = fs.readdirSync(el)
    .filter(function(f) { return path.extname(f) =='.html' })
    .map(function(f) { return path.join(el, f) })

  function template(f) {
    return f.replace('.html', '.tl')
  }

  tl.process(files.map(template))

  files.forEach(function(f) {
    it(path.basename(f), function() {
      var html = fs.readFileSync(f, 'utf8').trim();
      tl.html.render(template(f), data).replace(/&#x2f;/g, '/').should.equal(html)
    })
  })
})

describe('scope', function() {
  var scope = require('../lib/html/scope')

  it('should expose global vars', function() {
    var s = scope({ foo: 42 })
    s.get('foo').should.equal(42)
  })

  it('sub-scope should shadow parent', function() {
    var s = scope({ foo: 42 })
    s.sub(23, 'foo').get('foo').should.equal(23)
  })

  it('should expose global vars to sub-scopes', function() {
    var s = scope({ foo: 42 })
    s.sub(23, 'bar').get('foo').should.equal(42)
  })

  it('should expose global vars to fresh scopes', function() {
    var s = scope({ foo: 42 })
    s.fresh({}).get('foo').should.equal(42)
  })

  it('should not expose local vars to fresh scopes', function() {
    var s = scope({ foo: 42 })
    s.set('foo', 23)
    s.fresh({}).get('foo').should.equal(42)
  })
})
