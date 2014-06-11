var fs = require('fs')
  , should = require('should')
  , path = require('path')
  , teal = require('../lib')
  , lsr = require('../lib/lsr')

describe('all', function() {

  var root = path.join(__dirname, 'fixture', 'views')
  var settings = path.join(root, 'settings.tl')

  var tl = teal({ root: root })

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

  var files = lsr(root).filter(function(f) {
    return path.extname(f) =='.html'
  })

  function template(f) {
    return f.replace('.html', '.tl')
  }

  tl.process([settings].concat(files.map(template)))

  files.forEach(function(f) {
    it(path.basename(f), function() {
      var html = fs.readFileSync(f, 'utf8').trim();
      tl.html.render(template(f), data).replace(/&#x2f;/g, '/').should.equal(html)
    })
  })
})
