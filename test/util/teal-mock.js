module.exports = {
  macros: require('../../lib/macros'),
  css: {
    functions: require('../../lib/css/functions'),
  },
  expose: function(path) {
    return { url: 'exposed' }
  }
}
