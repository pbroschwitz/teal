var pascal = require('pascal-case')


exports.component = function(dir, name) {
  var pre = dir
    .replace(/\//g, '-')
    .replace(/$/, '-')
    .replace(/^-+/, '')

  return pre + pascal(name)
}

exports.npmComponent = function(mod, dir, name) {
  return mod.toLowerCase() + '_' + exports.component(dir, name)
}

exports.sub = function(parent, sub, count) {
  return parent + '_' + sub + (count > 1 ? '-' + count : '')
}

exports.descendant = function(name, tag) {
  return name ? name.toLowerCase() : '_' + tag
}
