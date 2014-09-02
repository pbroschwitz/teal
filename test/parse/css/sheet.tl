div {
  float: left;
  @sheet oldie {
    float: none;
  }
  :hover {
    @sheet oldie {
      background: red;
    }
  }
}
