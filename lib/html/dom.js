module.exports = function(document, u) {

  var decorate = u.dom.decorate
  var append = u.dom.append
  var classes = u.dom.classes

  return {
    getData: function render(args, ctx) {
      var data = args[0] || {}
      if (args.length > 1) {
        data.children = Array.prototype.slice.call(arguments, 1)
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

      var cls = classes(scope, className, states)
      if (el.nodeType == 1) decorate(el.root || el, cls, attrs)
      return el
    },

    el: function(tag, className, states, scope, attrs, children) {
      var el = document.createElement(tag)
      decorate(el, classes(scope, className, states), attrs)
      append(el, children)
      return el
    },

    comment: function(txt) {
      return document.createComment(txt)
    },

    html: function(html) {
      var f = document.createDocumentFragment()
      f.innerHTML = html
      return f
    }
  }
}
