var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate HTML', function() {
    var dir = path.join(__dirname, 'fixture')
    var tl = teal(dir)
    tl.init()

    tl.html.render(dir + '/button.tl', { content: 'Click Me'}).should.equal('<button class="button">Click Me</button>')
    tl.html.render(dir + '/box.tl', { title: 'Hello', label: 'Click Me' }).should.equal('<div class="box"><h1 class="box_h1">Hello</h1><button class="button">Click Me</button></div>')
  })

})