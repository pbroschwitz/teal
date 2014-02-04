var vm = require('vm')
  , path = require('path')
  , dommy = require('dommy')

/**
 * Return a function that, if a filename matches the given extension, compiles
 * it and loads it as CommonJS module. If the extension doesn't match the call
 * is delegated to node's require() function.
 */
module.exports = function(ext, compile) {
  var cache = {}
  return function load(filename) {
    if (filename in cache) return cache[filename]
    if (path.extname(filename) != ext) return require(filename)
    var js = compile(filename)
    var exports = {}
    var module = { exports: exports }
    vm.runInNewContext(js, {
      document: dommy(),
      module: module,
      exports: exports,
      require: function(f) {
        var dir = path.dirname(filename)
        return load(path.resolve(dir, f))
      }
    }, filename + '.js')
    return cache[filename] = module.exports
  }
}