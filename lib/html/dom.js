module.exports = function(document, u) {

  return {

    component: function(fn) {
      return function(data) {
        if (!data) data = {}
        if (arguments.length > 1) {
          data.children = Array.prototype.slice.call(arguments, 1)
        }
        return fn(data)
      }
    },

    ref: function(fn, params, className, children) {
      var el = fn.apply(this, [params].concat(u.flatten(children)))
      var root = el.root || el
      if (className) u.dom.addClass(root, className)
      return el
    },

    el: function(tag, attrs, className, children) {
      var el = document.createElement(tag)
      u.dom.setAttributes(el, attrs)
      u.dom.addClass(el, className)
      u.dom.append(el, children)
      return el
    },

    comment: function(txt) {
      return document.createComment(txt)
    },

    html: function(html) {
      var f = document.createDocumentFragment()
      f.innerHTML = html
      return f
    },

    serialize: function(content) {
      var f = document.createDocumentFragment()
      u.dom.append(f, content)
      return f.innerHTML
    }
  }
}
