ul {
  @each $c in $contributors li {
    color: #000;
    @media screen {
      padding: 0;
    }
    $c.first
  }
}
