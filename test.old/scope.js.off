var should = require('should')
  , scope = require('../lib/scope')

describe('scope', function() {

  it('should set multiple values at once', function() {
    var s = scope({ foo: 42, bar: 23 })
    s.get('foo').should.equal(42)
    s.get('bar').should.equal(23)
  })

  it('sub-scope should shadow parent', function() {
    var s1 = scope()
    s1.set('foo', 'foo')
    s1.set('bar', 'bar')

    var s2 = s1.sub({ foo: 'baz' })
    s2.set('boo', 'boo')
    s2.get('boo').should.equal('boo')
    s2.get('bar').should.equal('bar')
    s2.get('foo').should.equal('baz')
    s1.get('foo').should.equal('foo')
  })

})
