var fs = require('fs')
  , should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  var root = path.join(__dirname, 'fixture', 'views')
  var el = path.join(root, 'el')
  var tl = teal()
  var data = {
    author: {
      name: {
        first: 'Felix',
        last: 'Gnass'
      }
    },
    contributors: [
      { first: 'Malte' },
      { first: 'Peter' }
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
