module.exports = function(document, u) {

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
      el.className = cls.join(' ').trim()
    }
    return el
  }

  return {

    getData: function render(args, ctx) {
      var data = args[0] || {}
      if (args.length > 1) {
        data.content = Array.prototype.slice.call(arguments, 1)
      }
      return data
    },

    ref: function(mod, scope, params, className, states) {
      var el = mod(params)
      var attrs = Object.keys(params)
        .filter(function (n) {
          return !~mod.params.indexOf(n)
            && !~states.indexOf(n)
        })
        .map(function(n) { return { name: n, value: params[n] } })

      if (el.nodeType == 1) decorate(el.root || el, u.classes(scope, className, states), attrs)
      return el
    },

    el: function(tag, className, states, scope, attrs, children) {
      var el = document.createElement(tag)
      decorate(el, u.classes(scope, className, states), attrs)
      append(el, children)
      return el
    },

    comment: function(txt) {
      return document.createComment(txt)
    }

  }
}
