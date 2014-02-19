var path = require('path')
  , through = require('through')

/**
 * Creates a browserify transform function that compiles `.tl` files.
 */
module.exports = function(teal) {
  return function(file) {
    if (path.extname(file) != '.tl') return through()
    return through(function() {}, function() {
      this.queue(teal.html.compile(file))
      this.queue(null)
    })
  }
}