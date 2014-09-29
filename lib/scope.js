/**
 * Create a new scope from the given data.
 */
module.exports = function(data) {
  var chain = Array.prototype.slice.call(arguments, 1)
  var parent = chain.reduce(function(parent, data) {
    return data ? new Scope(data, parent) : parent
  }, null)
  return new Scope(data, parent)
}

function Scope(data, parent) {
  this.data = {}
  this.parent = parent
  this.set(data)
}

/**
 * Lookup a value going up the whole scope chain.
 */
Scope.prototype.get = function(key) {
  if (key in this.data) return this.data[key]
  if (this.parent) return this.parent.get(key)
}

/**
 * Set one or multiple values.
 */
Scope.prototype.set = function(key, val) {
  if (typeof key == 'object') {
    var data = key
    for (var k in data) {
      this.data[k] = data[k]
    }
  }
  else if (key) {
    this.data[key] = val
  }
}

//...
Scope.prototype.setDefault = function(key, val) {
  if (!(key in this.data)) this.data[key] = val
}

/**
 * Set defaults.
 */
Scope.prototype.defaults = function(defs) {
  for (var k in defs) this.setDefault(k, defs[k])
}

/**
 * Create a sub scope with read-access to the local vars.
 */
Scope.prototype.sub = function(data) {
  return new Scope(data, this)
}
