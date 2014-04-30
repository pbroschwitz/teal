var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate CSS', function() {
    css('a.tl', '.a{color:#000;}')
  })

  it('should include dependencies', function() {
    css('box.tl', '.a{color:#000;}.box{background:silver;}.box > .h1{font-size:2em;}')
  })

  it('should style anonymous inline blocks', function() {
    css('anon.tl', '.cols > .div{float:left;width:50%;}.cols > .div2{float:right;width:50%;}')
  })

  it('should support inline animations', function() {
    css('animation.tl', '@keyframes animation-eye{0%{margin-left:-20%;}to{margin-left:100%;}}.animation{background:black;height:25px;width:200px;overflow:hidden;}.animation > .eye{height:100%;width:20%;background:red;animation:animation-eye 4s linear 0s infinite alternate;}')
  })

  it('should support parent selectors', function() {
    css('parent.tl', '.a{color:#000;}.parent:hover > b{color:green;}.parent:hover > b > div{color:pink;}.parent:hover > .c{color:yellow;}.parent:hover > .a{color:blue;}')
  })

  it('should generate state rules', function() {
    css('button.tl', '.button{border:none;border-radius:4px;background:#333;color:#fff;}.button.disabled{background:#999;}.button.primary{color:blue;}.button.disabled.primary{color:#000;}')
  })

})

function css(file, expected) {
  var root = path.join(__dirname, 'fixture', 'simple')
  var tl = teal({ root: root })
  tl.css.sourcemap = false
  tl.css.normalize = false
  tl.css.autoprefix = false
  tl.process([ path.join(root, file) ])
  tl.resources.get('/main.css').data.should.equal(expected)
}
