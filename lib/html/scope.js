/**
 * Create a new scope from the given data. If `data` already is a Scope
 * instance it is returned verbatim.
 */
module.exports = function(data) {
  if (data instanceof Scope) return data
  return new Scope(data)
}

function Scope(data, parent) {
  this.locals = {}
  this.chain = [this.locals].concat(data, parent || [])
}

/**
 * Lookup a value going up the whole scope chain.
 */
Scope.prototype.get = function(key) {
  var c = this.chain
  for (var i = 0; i < c.length; i++) {
    if (c[i][key] !== undefined) return c[i][key]
  }
}

/**
 * Set local value.
 */
Scope.prototype.set = function(key, val) {
  this.locals[key] = val
}

/**
 * Create a sub-scope for the given value.
 */
Scope.prototype.sub = function(value) {
  return new Scope([{ _: value }, value], this.chain)
}

/**
 * Create a fresh scope with the sdme globals.
 */
Scope.prototype.fresh = function(data) {
  return new Scope(data, this.chain.slice(-1))
}
