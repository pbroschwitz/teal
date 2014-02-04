var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate CSS', function(done) {
    var view = teal({
      root: path.join(__dirname, 'fixture'),
      normalize: false
    })
    view.init()
    view.on('end', function() {
      var css = view.resources.get('/main.css').data
      css.should.equal('.button{border:none;border-radius:4px;background:#333;color:#fff;}.button.primary{color:blue;}.button{border:none;border-radius:4px;background:#333;color:#fff;}.button.primary{color:blue;}.box{background:silver;}.box > h1{font-size:2em;}')
      done()
    })
  })

})