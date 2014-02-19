var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate CSS', function() {
    var tl = teal({
      root: path.join(__dirname, 'fixture'),
    })
    tl.css.sourcemap = false
    tl.css.normalize = false
    tl.process([
      path.join(__dirname, 'fixture', 'button.tl')
    ])
    var css = tl.resources.get('/main.css').data
    css.should.equal('.button{border:none;border-radius:4px;background:#333;color:#fff;}.button.primary{color:blue;}')
  })

})