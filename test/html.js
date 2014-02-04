var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate HTML', function(done) {
    var dir = path.join(__dirname, 'fixture')
    var view = teal(dir)
    view.init()

    var file = path.join(dir, 'box.tl')
    var data = { title: 'Hello', label: 'Click Me' }
    view.engine(file, data, function(err, html) {
      html.should.equal('<div class="box"><h1>Hello</h1><button class="button">Click Me</button></div>')
      done()
    })
  })

})