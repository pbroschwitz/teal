div {
  color: white;
  background: teal;
  :hover,
  :active {
    background: coral
  }
  .big {
    font-size: 4em;
  }
  [disabled] {
    background: gray;
  }
  > * {
    color: inherit;
  }
}
