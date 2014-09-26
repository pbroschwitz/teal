exports.decorate = function(el, className, attrs) {
  if (className) exports.addClass(el, className)
  exports.setAttributes(el, attrs)
  return el
}

exports.setAttributes = function(el, attrs) {
  for (var n in attrs) {
    var val = attrs[n]
    if (val) el.setAttribute(n, val)
  }
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

/**
 * Append `child` to `el`. If child is not a Node, create a TextNode.
 */
exports.append = function append(el, child) {
  if (child === undefined || child === null) return
  if (child.forEach) child.forEach(function(c) { append(el, c) })
  else if (child.children) child.children.forEach(function(c) { append(el, c) }) //REVISIT block support
  else el.appendChild(child.nodeType? child : el.ownerDocument.createTextNode(child))
}
