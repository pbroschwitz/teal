./section {
  ./foo {
    border: 1px solid red;
    @media const(desktop) {
      .ready {
        border-color: const(fav-color);
      }
    }
  }
}
