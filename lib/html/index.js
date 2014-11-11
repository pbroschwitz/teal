var Compiler = require('./compiler')
var js = require('./js')

module.exports = function(teal) {
  return new HTML(teal)
}

function HTML(teal) {
  this.teal = teal
  var js = this.js = this.createJsCompiler()
  this.setCompiler(js)
}

HTML.prototype = {

  get engine() {
    var n = this._engine
    if (!n) n = this._engine = require('./engine')(this.teal)
    return n
  },

  setCompiler: function(c) {
    var teal = this.teal
    if (!(c instanceof Compiler)) c = this.createCompiler(c)
    if (this.compiler) this.compiler.removeAllListeners('change')
    this.compiler = c.on('change', teal.emit.bind(teal, 'change'))
  },

  createCompiler: function(visitor) {
    var c = new Compiler(visitor)
    this.teal.on('process', function(files) {
      c.invalidate(files)
    })
    return c
  },

  createJsCompiler: function(runtime) {
    var c = this.createCompiler(js)
    c.context.runtime = runtime
    return c
  },

  process: function(asts, modified) {
    var c = this.compiler
    modified.forEach(c.generate, c)
  },

  render: function(file, data) {
    return this.engine(file, data)
  }

}
