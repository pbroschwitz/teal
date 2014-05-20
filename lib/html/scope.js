/**
 * Create a new scope from the given data. If `data` already is a Scope
 * instance it is returned verbatim.
 */
module.exports = function(args, $this) {
  var data = args[0] || {}
  if (data instanceof Scope) return data
  if (args.length > 1) {
    data.content = Array.prototype.slice.call(args, 1)
  }
  if ($this) data["this"] = $this
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
Scope.prototype.sub = function(value, as) {
  var sub = {}
  sub[as] = value
  return new Scope(sub, this.chain)
}

/**
 * Create a fresh scope with the same globals.
 */
Scope.prototype.fresh = function(data) {
  return new Scope([data]) //FIXME, this.chain.slice(-1))
}

Scope.prototype.classes = function(base, states) {
  var cls = []
  if (base) cls.push(base)
  return cls.concat(states.filter(this.get, this)).join(' ')
}
