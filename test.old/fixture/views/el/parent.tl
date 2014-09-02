p {
  b {
    ^1:hover { color: green }
    div {
      ^2:hover { color: pink }
    }
    ^.foo { color: teal }
  }
  b.c {
    ^1:hover { color: yellow }
    ^3:hover { color: gold }
  }
  ./a {
    ^1:hover { color: blue }
  }
}
