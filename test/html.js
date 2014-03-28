var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate HTML', function() {
    var root = path.join(__dirname, 'fixture', 'simple')
    var button = path.join(root, 'button.tl')
    var box = path.join(root, 'box.tl')
    var pbutton = path.join(root, 'p-button.tl')
    var frag = path.join(root, 'fragment.tl')
    var a = path.join(root, 'a.tl')
    var ifelse = path.join(root, 'ifelse.tl')

    var tl = teal()

    tl.process([button, box, pbutton, frag, a, ifelse])

    tl.html.render(button, { content: 'Click Me'}).should.equal('<button class="button">Click Me</button>')
    tl.html.render(button, { content: 'Click Me', primary: true }).should.equal('<button class="button primary">Click Me</button>')
    tl.html.render(box, { title: 'Hello', label: 'Click Me' }).should.equal('<div class="box"><h1 class="box_h1">Hello</h1><button class="button">Click Me</button></div>')
    tl.html.render(pbutton, {}).should.equal('<p class="para p-button"><button class="button">Click</button></p>')
    tl.html.render(frag, {}).should.equal('<p class="para">Hello</p><p class="para">World</p>')
    tl.html.render(a, { content: 'Hello', href: '#' }).should.equal('<a class="a" href="#">Hello</a>')
    tl.html.render(ifelse, { hey: 'Hey!' }).should.equal('<p class="para">Hey!</p>')
  })

})
