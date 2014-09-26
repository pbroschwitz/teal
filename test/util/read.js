var fs = require('fs')

module.exports = function(f) {
  return fs.readFileSync(f, 'utf8').trim()
}
