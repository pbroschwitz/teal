./section {
  ./foo {
    border: 1px solid red;
    @media screen {
      .ready {
        border-color: $fav-color;
      }
    }
  }
}
