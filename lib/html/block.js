module.exports = function Block(props, children) {
  for (var n in props) {
    this[n] = props[n]
  }
  this.children = children || []
}
