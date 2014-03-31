var fs = require('fs')
  , should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  var root = path.join(__dirname, 'fixture', 'simple')
  var tl = teal()
  var data = {
    names: [
      { first: 'Felix' },
      { first: 'Malte' }
    ]
  }
  var files = fs.readdirSync(root)
    .filter(function(f) { return path.extname(f) =='.html' })
    .map(function(f) { return path.join(root, f) })

  function template(f) {
    return f.replace('.html', '.tl')
  }

  tl.process(files.map(template))

  files.forEach(function(f) {
    it(path.basename(f), function() {
      var html = fs.readFileSync(f, 'utf8').trim()
      tl.html.render(template(f), data).should.equal(html)
    })
  })

})
