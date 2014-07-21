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
    css('anon.tl', '.el-cols > .div-1{float:left;width:50%;}.el-cols > .div-2{float:right;width:50%;}.el-anon_p-1{color:red;}.el-anon_p-2{color:green;}')
  })

  it('should call functions', function() {
    css('func.tl', '.el-a{color:#000;}.el-func{background:url("/assets/el/func.html#foo");font:1em/1.2 serif;}')
  })

  it('should support consts', function() {
    css('const.tl', '.el-const{color:#f00;}')
  })

  it('should support inline animations', function() {
    css('animation.tl', '@keyframes el-animation_eye{0%{margin-left:-20%;}to{margin-left:100%;}}.el-animation{background:black;height:25px;width:200px;overflow:hidden;}.el-animation > .eye{height:100%;width:20%;background:red;animation:el-animation_eye 4s linear 0s infinite alternate;}')
  })

  it('should support parent selectors', function() {
    css('parent.tl', '.el-a{color:#000;}.el-parent:hover > .b-1{color:green;}.el-parent:hover > .b-1 > div{color:pink;}.foo .el-parent > .b-1{color:teal;}.el-parent:hover > .c{color:yellow;}*:hover > * > .el-parent > .c{color:gold;}.el-parent:hover > .el-parent_a{color:blue;}')
  })

  it('should support sibling selectors', function() {
    css('siblings.tl', '.el-siblings > .a{color:red;}.el-siblings > .b{color:green;}.el-siblings > .a:hover~.b{color:yellow;}.el-siblings > .a:hover~.c{color:pink;}')
  })

  it('should support star selectors', function() {
    css('star.tl', '.el-star > *{color:#000;}.el-star > *:hover{color:red;}')
  })

  it('should generate state rules', function() {
    css('button.tl', '.el-button{border:none;border-radius:4px;background:#333;color:#fff;}.el-button.primary{color:blue;}.el-button.disabled.primary{color:#000;}@media screen{.el-button.disabled{background:#999;}}')
  })

  it('should include mixins', function() {
    css('include.tl', '.el-include{color:#000;}.el-include > ul{background:#fff;padding:0;}.el-include > ul:after{content:"in the mix";}@media screen{.el-include{background:red;padding:0;}.el-include:after{content:"in the mix";}}')
    css('ref-include.tl', '.el-include{color:#000;}.el-include > ul{background:#fff;padding:0;}.el-include > ul:after{content:"in the mix";}@media screen{.el-include{background:red;padding:0;}.el-include:after{content:"in the mix";}}')
  })

  it('should group media queries', function() {
    css('media.tl', '.el-media-test{font-size:1em;}.el-media{background:lime;}@media (min-width:960px){.el-media-test{font-size:2em;}.el-media{background:red;}}')
  })

  it('should support media queries inside loops', function() {
    css('each.tl', '.el-each > li{color:#000;}@media screen{.el-each > li{padding:0;}}')
  })

  it('should include media queries only once', function() {
    css('media-2x.tl', '.el-media-test{font-size:1em;}.el-media{background:lime;}@media (min-width:960px){.el-media-test{font-size:2em;}.el-media{background:red;}}')
  })

  it('should filter @sheet by name', function() {
    css('sheet.tl', '.el-sheet{color:#000;}.el-sheet{background:#fff;}')
  })

})

function css(files, expected) {
  if (!Array.isArray(files)) files = [files]
  var root = path.join(__dirname, 'fixture', 'views')
  var tl = teal({ root: root })
  tl.css.sourcemap = false
  tl.process(
    [path.join(root, 'settings.tl')]
    .concat(files.map(function(f) {
      return path.join(root, 'el', f)
    }))
  )
  tl.resources.get('/main.css').data.should.equal(expected)
}
