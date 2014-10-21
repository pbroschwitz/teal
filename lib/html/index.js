var compiler = require('./compiler')
var js = require('./js')

module.exports = function(teal) {
  return new HTML(teal)
}

function HTML(teal) {
  this.teal = teal
  this.compiler = this.js = this.createJsCompiler()
}

HTML.prototype = {

  get engine() {
    var n = this._engine
    if (!n) n = this._engine = require('./engine')(this.teal)
    return n
  },

  setCompiler: function(visitor) {
    this.compiler = compiler(visitor)
  },

  createCompiler: function(visitor) {
    return compiler(visitor)
  },

  createJsCompiler: function(runtime) {
    var c = compiler(js)
    c.context.runtime = runtime
    return c
  },

  process: function(asts) {
    var c = this.compiler
    asts.forEach(c.generate, c)
  },

  render: function(file, data) {
    return this.engine(file, data)
  }

}
