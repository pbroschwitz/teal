module.exports = function Block(props) {
  for (var n in props) {
    this[n] = props[n]
  }
  if (!this.children) this.children = []
}
