@defaults {
  content="Submit"
}
button {
  border: none;
  border-radius: 4px;
  background: #333;
  color: #fff;
  @media screen {
    .disabled {
      background: #999
    }
  }
  .primary {
    color: blue;
    .disabled {
      color: #000
    }
  }

  $content
}
