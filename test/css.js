var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('all', function() {

  it('should generate CSS', function() {
    css('a.tl', '.el-a{color:#000;}')
  })

  it('should include dependencies', function() {
    css('box.tl', '.el-a{color:#000;}.el-box{background:silver;}.el-box > .hd{font-size:2em;}')
  })

  it('should style anonymous inline blocks', function() {
    css('anon.tl', '.el-cols > .div-5{float:left;width:50%;}.el-cols > .div-6{float:right;width:50%;}')
  })

  it('should support inline animations', function() {
    css('animation.tl', '@keyframes el-animation_eye{0%{margin-left:-20%;}to{margin-left:100%;}}.el-animation{background:black;height:25px;width:200px;overflow:hidden;}.el-animation > .eye{height:100%;width:20%;background:red;animation:el-animation_eye 4s linear 0s infinite alternate;}')
  })

  it('should support parent selectors', function() {
    css('parent.tl', '.el-a{color:#000;}.el-parent:hover > b{color:green;}.el-parent:hover > b > div{color:pink;}.el-parent:hover > .c{color:yellow;}.el-parent:hover > .el-a{color:blue;}')
  })

  it('should generate state rules', function() {
    css('button.tl', '.el-button{border:none;border-radius:4px;background:#333;color:#fff;}.el-button.disabled{background:#999;}.el-button.primary{color:blue;}.el-button.disabled.primary{color:#000;}')
  })

})

function css(file, expected) {
  var root = path.join(__dirname, 'fixture', 'views')
  var tl = teal({ root: root })
  tl.css.sourcemap = false
  tl.css.normalize = false
  tl.css.autoprefix = false
  tl.process([ path.join(root, 'el', file) ])
  tl.resources.get('/main.css').data.should.equal(expected)
}
