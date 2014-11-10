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

    el: function(tag, attrs, className, children) {
      var el
      if (typeof tag == 'function') {
        el = tag.apply(this, [attrs].concat(u.flatten(children)))
      }
      else {
        el = document.createElement(tag)
        u.dom.setAttributes(el, attrs)
        u.dom.append(el, children)
      }
      u.dom.addClass(el.root || el, className)
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
