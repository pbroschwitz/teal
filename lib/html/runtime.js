/**
 * Append `child` to `el`. If child is not a Node, create a TextNode.
 */
exports.append = function(el, child) {
  if (!child) return
  if (child.forEach) child.forEach(function(c) { exports.append(el, c) })
  else el.appendChild(child.nodeType? child : el.ownerDocument.createTextNode(child))
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
 * Invoke the iterator function for each item in the list.
 */
exports.each = function(list, iterator) {
  if (list) list.forEach(function(item) { iterator(item) })
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

// Expose Math functions
var math = ['min', 'max', 'ceil', 'floor', 'round', 'sqrt', 'pow']
math.forEach(function(method) {
  exports[method] = function() {
    return Math[method].apply(this, arguments)
  }
})
