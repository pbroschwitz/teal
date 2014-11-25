var path = require('path')
var vm = require('vm')

var dommy = require('dommy')

module.exports = function(teal) {

  var cache = {}

  function load(file) {
    if (file.slice(-3) != '.tl') return require.main.require(file)
    var mod = cache[file]
    if (!mod) {
      var dir = path.dirname(file)
      var exports = {}
      var module = { exports: exports }
      var code = teal.html.js.getCode(file)
      vm.runInNewContext(code, {
        document: dommy(),
        console: console,
        module: module,
        exports: exports,
        require: function(f) {
          return load(f)
        }
      }, file + '.js')
      mod = cache[file] = module.exports
    }
    return mod
  }

  require.extensions['.tl'] = function(module, file) {
    module.exports = load(file)
  }

  teal.on('process', function(files) {
    files.forEach(function(f) {
      cache[f] = require.cache[f] = undefined
    })
  })

  function render(file, data, cb) {
    process.nextTick(function() {
      try {
        cb(null, renderSync(file, data))
      }
      catch (err) {
        console.log(err)
        cb(err)
      }
    })
  }

  function renderSync(file, data) {
    data.noImplicitAtts = true
    var el = load(file)(data)
    var html = ''
    if (el.doctype) {
      html = '<!DOCTYPE ' + el.doctype + '>'
      el = el.root
    }
    html += teal.html.js.serialize(el)
    return html
  }

  return function(file, data, cb) {
    if (!cb) return renderSync(file, data)
    render(file, data, cb)
  }
}
