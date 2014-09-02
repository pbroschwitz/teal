div {
  background: url(src('./func.html') + '#foo');
  font: 1em/1.2 serif;
  ./a()
  ./a({ foo="Hello" })
  ./a({
    href=src("./func.tl")
    ´
      Hello
      World!
    ´
  })
}
