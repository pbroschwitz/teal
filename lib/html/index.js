var dommy = require('dommy')
  , path = require('path')
  , vm = require('vm')
  , visitor = require('../visitor')
  , scope = require('../scope')

module.exports = function(teal) {
  return new HTML(teal)
}

function HTML(teal) {
  this.teal = teal
  this.code = {}
  this.cache = {}
  this.flavors = []
  this.aliases = { browser: 'js' }
  this.registerFlavor('js', this.jsFlavor(__dirname + '/dom'))

  var self = this
  this.engine = function(file, data, cb) {
    process.nextTick(function() {
      cb(null, self.render(file, data))
    })
  }
}

HTML.prototype.jsFlavor = require('./js')

HTML.prototype.registerFlavor = function(name, on) {
  if (typeof on == 'string') {
    this.aliases[name] = on
    return
  }
  var code = this.code[name] = {}
  var v = visitor(on)
  this.flavors.push({
    name: name,
    code: code,
    generate: function(ast, ctx) {
      return code[ast.file] = v.visit(ast, ctx)
    }
  })
}

HTML.prototype.getCode = function(file, flavor) {
  var f = flavor && this.aliases[flavor] || flavor || 'js'
  var c = this.code[f]
  if (!c) throw new Error('No such flavor: ' + f)
  var code = c[file]
  if (!code) throw new Error('No ' + f + ' code found for ' + file)
  return code
}


HTML.prototype.process = function(ctx) {
  var html = this
  var vc = {
    vars: scope()
  }
  ctx.asts.forEach(function(ast) {
    vc.ctx = ctx.sub(ast.file)
    html.cache[ast.file] = undefined
    html.flavors.forEach(function(flav, i) {
      var prev = html.code[flav.name][ast.file]
      var code = flav.generate(ast, vc)
      if (i === 0) {
        // compare with previous version to detect markup changes
        if (prev && prev != code) html.teal.emit('change', ast.root.class)
      }
    })
  })
}

HTML.prototype.load = function(file) {
  if (file.slice(-3) != '.tl') return require(file)
  var self = this
  var mod = self.cache[file]
  if (!mod) {
    var dir = path.dirname(file)
    var exports = {}
    var module = { exports: exports }
    var code = self.getCode(file)
    vm.runInNewContext(code, {
      document: dommy(),
      console: console,
      module: module,
      exports: exports,
      require: function(f) {
        return self.load(path.resolve(dir, f))
      }
    }, file + '.js')
    mod = self.cache[file] = module.exports
  }
  return mod
}

HTML.prototype.render = function(file, data) {
  var el = this.load(file)(data)
  var html = ''
  if (el.doctype) {
    html = '<!DOCTYPE ' + el.doctype + '>'
    el = el.root
  }
  html += el.toString()
  return html
}
