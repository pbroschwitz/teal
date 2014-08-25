exports.decorate = function(el, className, attrs) {
  if (className) exports.addClass(el, className)
  if (attrs) attrs.forEach(function(a) {
    if (a.value) el.setAttribute(a.name, a.value)
  })
  return el
}

/**
 * Add `className` to the element's classList. If a third argument is passed
 * the class is only added if the value is truthy.
 */
exports.addClass = function(el, className, add) {
  if (arguments.length == 2 || add) {
    var cls = (el.className||'').split(' ')
    if (!~cls.indexOf(className)) cls.push(className)
    el.className = cls.join(' ').trim()
  }
  return el
}

exports.classes = function(scope, base, states) {
  var cls = []
  if (base) cls.push(base)
  if (states) cls = cls.concat(states.filter(scope.get, scope))
  return cls.join(' ')
}

/**
 * Append `child` to `el`. If child is not a Node, create a TextNode.
 */
exports.append = function append(el, child) {
  if (child === undefined || child === null) return
  if (child.forEach) child.forEach(function(c) { append(el, c) })
  else el.appendChild(child.nodeType? child : el.ownerDocument.createTextNode(child))
}
