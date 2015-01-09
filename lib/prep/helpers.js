module.exports = {

  /** utility method for macros that need to create elements */
  el: function(name, attrs) {
    if (~name.indexOf('/')) name = { type: 'path', path: this.resolve(name) }
    var children = attrs.children || Array.prototype.slice.call(arguments, 2)
    delete attrs.children
    return {
      type: 'element',
      name: name,
      attributes: Object.keys(attrs).map(function(n) {
        return { type: 'attribute', name: n, value: attrs[n] }
      }),
      children: children
    }
  },

  /** utility method for macros that need to generate multiple values */
  //  return { type: 'values', values: values }
  //}

}
