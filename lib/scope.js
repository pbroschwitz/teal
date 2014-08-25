/**
 * Create a new scope from the given data.
 */
module.exports = function(data, parent) {
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
 * Return an object with the specified `vars` as properties.
 */
/*
Scope.prototype.pick = function(vars) {
  var ret = {}
  vars.forEach(function(n) {
    var v = this.get(n)
    if (v !== undefined) ret[n] = v
  }, this)
  return ret
}
*/

/**
 * Create a sub scope with read-access to the local vars.
 */
Scope.prototype.sub = function(data, defaults) {
  var sub = new Scope(data, this)
  sub.defaults(defaults)
  return sub
}
