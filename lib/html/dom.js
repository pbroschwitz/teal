module.exports = function(document) {

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
    if (arguments.length == 2 || add) el.classList.add(className)
    return el
  }

  return {

    decorate: decorate,

    el: function(tag, className, attrs, children) {
      var el = document.createElement(tag)
      decorate(el, className, attrs)
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
    },

    setState: function(el, scope, states) {
      if (states) states.forEach(function(s) {
        addClass(el, s, scope.get(s))
      })
      return el
    }

  }
}
