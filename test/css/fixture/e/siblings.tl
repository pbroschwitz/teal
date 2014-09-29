div {
  input {
    z-index: -1;
  }
  label {
    +:checked {
      color: teal;
    }
  }
  div#indicator {
    background: white;
    ~2:checked {
      background: teal;
    }
  }
}
