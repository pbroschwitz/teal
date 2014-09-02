var fs = require('fs')
  , path = require('path')
  , ls = require('../lib/util/ls')
  , should = require('should')
  , teal = require('../lib')

describe('all', function() {

  var root = path.join(__dirname, 'fixture', 'views')
  var settings = path.join(root, 'settings.tl')

  var tl = teal({ root: root })

  var data = {
    world: 'World',
    foo: 42,
    "foo-bar": 23,
    bar: {
      foo: 23,
      baz: function() { return 42 }
    },
    getBar: function() {
      return { foo: 23 }
    },
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

  var files = ls(root).filter(function(f) {
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
