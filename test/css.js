var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate CSS', function() {
    css('button.tl').should.equal('.button{border:none;border-radius:4px;background:#333;color:#fff;}.button.primary{color:blue;}')
    css('box.tl').should.equal('.button{border:none;border-radius:4px;background:#333;color:#fff;}.button.primary{color:blue;}.box{background:silver;}.box_h1{font-size:2em;}')
    css('animation.tl').should.equal('@keyframes animation-eye{0%{margin-left:-20%;}to{margin-left:100%;}}.animation{background:black;height:25px;width:200px;overflow:hidden;}.animation_eye{height:100%;width:20%;background:red;animation:animation-eye 4s linear 0s infinite alternate;}')
  })

})

function css(file) {
  var root = path.join(__dirname, '/fixture')
  var tl = teal({ root: root })
  tl.css.sourcemap = false
  tl.css.normalize = false
  tl.css.autoprefix = false
  tl.process([ path.join(root, file) ])
  return tl.resources.get('/main.css').data
}