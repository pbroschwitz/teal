div {
  @if $foo "foo!"
  @else {
    h1 { "sorry" }
    "no foo for you"
  }
}
