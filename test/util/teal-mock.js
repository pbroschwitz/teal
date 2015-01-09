module.exports = {
  macros: require('../../lib/macros'),
  naming: require('../../lib/naming'),
  css: {
    functions: require('../../lib/css/functions'),
  },
  expose: function(path) {
    return { url: 'exposed' }
  }
}
