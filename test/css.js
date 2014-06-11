var should = require('should')
  , path = require('path')
  , teal = require('../lib')

describe('teal/css', function() {

  it('should generate CSS', function() {
    css('a.tl', '.el-a{color:#000;}')
  })

  it('should include dependencies', function() {
    css('box.tl', '.el-a{color:#000;}.el-box{background:silver;}.el-box > .hd{font-size:2em;}')
  })

  it('should output css functions verbatim', function() {
    css('p.tl', '.el-p{color:rgba(0,0,0,0.8);}')
  })

  it('should style anonymous inline blocks', function() {
    css('anon.tl', '.el-cols > .div-1{float:left;width:50%;}.el-cols > .div-2{float:right;width:50%;}')
  })

  it('should call functions', function() {
    css('func.tl', '.el-func{background:url("/assets/el/func.html");}')
  })

  it('should support css params', function() {
    css('css-params.tl', '.el-parambox{background:#fff;color:#333;}.el-parambox > .hd{font-size:1em;}.el-css-params_el-parambox{background:silver;}.el-css-params_el-parambox > .hd{font-size:2em;}')
  })

  it('should support referencing parameterized elements', function() {
    css('para-ext-ref.tl', '.el-p{color:rgba(0,0,0,0.8);}.el-para-ext{background:#f00;color:#333;}')
  })

  it('should support global defaults', function() {
    css('defaults.tl', '.el-defaults{color:#f00;}')
  })

  it('should support inline animations', function() {
    css('animation.tl', '@keyframes el-animation_eye{0%{margin-left:-20%;}to{margin-left:100%;}}.el-animation{background:black;height:25px;width:200px;overflow:hidden;}.el-animation > .eye{height:100%;width:20%;background:red;animation:el-animation_eye 4s linear 0s infinite alternate;}')
  })

  it('should support parent selectors', function() {
    css('parent.tl', '.el-a{color:#000;}.el-parent:hover > b{color:green;}.el-parent:hover > b > div{color:pink;}.el-parent:hover > .c{color:yellow;}.el-parent:hover > .el-a{color:blue;}')
  })

  it('should support sibling selectors', function() {
    css('siblings.tl', '.el-siblings > .a{color:red;}.el-siblings > .b{color:green;}.el-siblings > .a:hover~.b{color:yellow;}.el-siblings > .a:hover~.c{color:pink;}')
  })

  it('should generate state rules', function() {
    css('button.tl', '.el-button{border:none;border-radius:4px;background:#333;color:#fff;}.el-button.disabled{background:#999;}.el-button.primary{color:blue;}.el-button.disabled.primary{color:#000;}')
  })

  it('should include mixins', function() {
    css('include.tl', '.el-include{color:#000;}.el-include > ul{background:#fff;}.el-include > ul:after{content:"in the mix";}')
  })

  it('should group media queries', function() {
    css('media.tl', '.el-media-test{font-size:1em;}.el-media{background:lime;}@media (min-width:960px){.el-media-test{font-size:2em;}.el-media{background:red;}}')
  })

})

function css(file, expected) {
  var root = path.join(__dirname, 'fixture', 'views')
  var tl = teal({ root: root })
  tl.css.sourcemap = false
  tl.process([
    path.join(root, 'settings.tl'),
    path.join(root, 'el', file)
  ])
  tl.resources.get('/main.css').data.should.equal(expected)
}
