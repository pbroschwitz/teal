div {
  color: #000;
  ul {
    ./mixin {
      bg-color: #fff;
      color: #000
    }
  }
  @media screen {
    ./mixin {
      bg-color: red;
    }
  }
}
