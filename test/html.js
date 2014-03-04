var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate HTML', function() {
    var root = path.join(__dirname, 'fixture', 'simple')
    var button = path.join(root, 'button.tl')
    var box = path.join(root, 'box.tl')

    var tl = teal()

    tl.process([button, box])

    tl.html.render(button, { content: 'Click Me'}).should.equal('<button class="button">Click Me</button>')
    tl.html.render(box, { title: 'Hello', label: 'Click Me' }).should.equal('<div class="box"><h1 class="box_h1">Hello</h1><button class="button">Click Me</button></div>')
  })

})
