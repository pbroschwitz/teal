module.exports = {
  macros: require('../../lib/macros'),

  expose: function(path) {
    return { url: 'exposed' }
  }
}
