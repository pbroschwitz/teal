var test = require('tap').test
var prep = require('../../lib/prep')
var simplify = require('../util/simplify')

var stages = {
  ref: [ 1, 2, 3 ],
  ambigious: [ 2 ],
  style: [ 1, 2, 3 ]
}

Object.keys(stages).forEach(function(name) {
  stages[name].forEach(function(i) {
    test('prepare ' + name + '-stage' + i, function(t) {
      var ctx = prep(__dirname, { stage: i })
      var ast = ctx.parse('/' + name + '.tl')
      var exp = require(ctx.resolve('/' + name + '-stage' + i + '.json'))
      t.deepEqual(simplify(ast, __dirname), exp)
      t.end()
    })
  })
})
