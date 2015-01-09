var uniqs = require('uniqs')

var addToProp = require('../util/addToProp')
var addUnique = require('../util/addUnique')

module.exports = function() {

  var cache = {}

  var dependencies = {}
  var dependants = {}

  var references = {}
  var referrers = {}

  return {

    put: function(ast) {
      return cache[ast.file] = ast
    },

    get: function(f) {
      return cache[f]
    },

    addDependency: function(file, dep) {
      if (file == dep) return
      addToProp(dependencies, file, dep)
      addToProp(dependants, dep, file)
    },

    invalidate: function(files) {
      return combine(files, dependants).map(function(f) {
        cache[f] = dependencies[f] = references[f] = undefined
        return f
      })
    },

    addReference: function(file, ref) {
      if (file == ref) return
      addToProp(references, file, ref)
      addToProp(referrers, ref, file)
    },

    getReferrers: function(f) {
      return referrers[f]
    },

    getReferences: function(f) {
      return references(f)
    },

    getTransitiveRefs: function(f) {
      var all = []
      function addRefs(f) {
        all.push(f)
        var refs = references[f]
        if (refs) refs.forEach(function(r) {
          if (!~all.indexOf(r)) addRefs(r)
        })
      }
      addRefs(f)
      return all
    },

    getAllFiles: function() {
      return uniqs(Object.keys(cache), Object.keys(dependants))
    },

    getAllAsts: function() {
      return Object.keys(cache).map(function(f) {
        return cache[f]
      })
    }

  }

}

function combine(files, dict) {
  var all = files.slice()
  files.forEach(function(f) {
    addUnique(all, dict[f])
  })
  return all
}
