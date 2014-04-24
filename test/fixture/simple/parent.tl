p {
  b {
    ^:hover { color: green }
    div {
      ^^:hover { color: pink }
    }
  }
  b.c {
    ^:hover { color: yellow }
  }
  ./a {
    ^:hover { color: blue }
  }
}
