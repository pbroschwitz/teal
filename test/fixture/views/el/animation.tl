div {
  background: black;
  height: 25px;
  width: 200px;
  overflow: hidden;

  div.eye {
    height: 100%;
    width: 20%;
    background: red;
    @animation 4s linear 0s infinite alternate {
      0% {
        margin-left: -20%
      }
      to {
        margin-left: 100%
      }
    }
  }
}
