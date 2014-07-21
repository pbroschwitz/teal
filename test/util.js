var should = require('should')
  , outdent = require('../lib/util/outdent')

describe('outdent', function() {

  it('should outdent indented strings', function() {
    outdent('\n\n    hello\n      world.').should.equal('\n\nhello\n  world.')
  })

})
