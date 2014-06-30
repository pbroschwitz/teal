var PEG = require('pegjs')
  , fs = require('fs')
  , path = require('path')

var grammar = fs.readFileSync(__dirname + '/grammar.pegjs', 'utf8')
  , parser = PEG.buildParser(grammar)

module.exports = function(src, options) {
  try {
    var ast = parser.parse(src, options)
    ast.file = options.file
    return ast
  }
  catch (err) {
    if (!err.location) {
      err.file = err.location = options.file
      if (err.line) err.location += ':' + err.line + ',' + err.column
    }
    throw err
  }
}
