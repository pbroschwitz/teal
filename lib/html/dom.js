module.exports = function(document, states) {

  function attr(el, name, val) {
    if (val) el.setAttribute(name, val)
  }

  function decorate(el, className, attrs) {
    if (className) addClass(el, className)
    if (attrs) attrs.forEach(function(a) {
      attr(el, a.name, a.value)
    })
    return el
  }

  /**
   * Append `child` to `el`. If child is not a Node, create a TextNode.
   */
  function append(el, child) {
    if (!child) return
    if (child.forEach) child.forEach(function(c) { append(el, c) })
    else el.appendChild(child.nodeType? child : document.createTextNode(child))
  }

  /**
   * Add `className` to the element's classList. If a third argument is passed
   * the class is only added if the value is truthy.
   */
  function addClass(el, className, add) {
    if (arguments.length == 2 || add) {
      var cls = (el.className||'').split(' ')
      if (!~cls.indexOf(className)) cls.push(className)
      el.className = cls.join(' ')
    }
    return el
  }

  return {

    ref: function(mod, scope, params, className, attrs) {
      var el = mod(scope.fresh(params))
      return decorate(el.root || el, className, attrs)
    },

    el: function(tag, className, scope, attrs, children) {
      var el = document.createElement(tag)
      decorate(el, scope.classes(className, states), attrs)
      append(el, children)
      return el
    },

    fragment: function(children) {
      var frag = document.createDocumentFragment()
      append(frag, children)
      return frag
    },

    comment: function(txt) {
      return document.createComment(txt)
    }

  }
}
