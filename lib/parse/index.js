var fs = require('fs')
var path = require('path')

var PEG = require('pegjs')

var helpers = require('./helpers')

var grammar = fs.readFileSync(__dirname + '/grammar.pegjs', 'utf8')

var parser = PEG.buildParser(grammar, {
  allowedStartRules: [ 'Start', 'StartSettings' ]
})

function parseFile(file) {
  var src = fs.readFileSync(file, 'utf8')
  return parse(src, file)
}

function parse(src, file) {
  var settings = path.basename(file)[0] == '_'
  var opts = {
    file: file,
    helpers: helpers,
    startRule: settings ? 'StartSettings' : 'Start'
  }
  try {
    var ast = parser.parse(src, opts)
    if (file) ast.file = file
    return ast
  }
  catch (err) {
    if (!err.location) {
      err.file = err.location = opts.file
      if (err.line) err.location += ':' + err.line + ',' + err.column
      console.log(err.location)
    }
    throw err
  }
}

module.exports = exports = parse
exports.file = parseFile
