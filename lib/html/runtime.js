exports.el = function(document, tag, className, attrs, children) {
  var el = document.createElement(tag)
  exports.decorate(el, className, attrs)
  exports.append(el, children)
  return el
}

exports.decorate = function(el, className, attrs) {
  if (className) exports.addClass(el, className)
  if (attrs) attrs.forEach(function(a) {
    exports.attr(el, a.name, a.value)
  })
  return el
}

/**
 * Append `child` to `el`. If child is not a Node, create a TextNode.
 */
exports.append = function(el, child) {
  if (!child) return
  if (child.forEach) child.forEach(function(c) { exports.append(el, c) })
  else el.appendChild(child.nodeType? child : el.ownerDocument.createTextNode(child))
}

/**
 * Set state classes.
 */
exports.setState = function(el, data, states) {
  if (states) states.forEach(function(s) {
    exports.addClass(el, s, data[s])
  })
  return el
}

/**
 * Merges all properties of `b` into `a` whoes keys are not in `a`.
 */
exports.merge = function(a, b) {
  for (var k in b) if (!(k in a)) a[k] = b[k]
  return a
}

exports.attr = function(el, name, val) {
  if (val) el.setAttribute(name, val)
}

exports.prop = function(el, name, val) {
  el[name] = val
  return el
}

/**
 * Add `className` to the element's classList. If a third argument is passed
 * the class is only added if the value is truthy.
 */
exports.addClass = function(el, className, add) {
  if (arguments.length == 2 || add) el.classList.add(className)
  return el
}

/**
 * Invoke the iterator function for each item in the list and return the results.
 */
exports.each = function(list, iterator) {
  if (list) return list.map(function(item) { return iterator(item) })
}

/**
 * Return the length of the list or `0` if no list is given.
 */
exports.length = function(obj) {
  return (obj||'').length
}

/**
 * Return a list that contains the numbers from `start` to `stop`.
 */
exports.range = function(start, stop, step) {
  if (arguments.length <= 1) {
    stop = start || 0
    start = 0
  }
  if (!step) step = 1
  var length = Math.max(Math.ceil((stop - start) / step), 0) + 1
  var i = 0
  var range = new Array(length)
  while (i < length) {
    range[i++] = start
    start += step
  }
  return range
}

exports.json = function(v) {
  return JSON.stringify(v)
}

exports.uri = function(v) {
  return encodeURI(v)
}

exports.uricomp = function(v) {
  return encodeURIComponent(v)
}

// Expose Math functions
var math = ['min', 'max', 'ceil', 'floor', 'round', 'sqrt', 'pow']
math.forEach(function(method) {
  exports[method] = function() {
    return Math[method].apply(this, arguments)
  }
})
