div {
  /m/solid { bg="teal" }
  h1 {
    font-size: 2em;
    .large {
      font-size: 4em;
    }
    :after {
      content: '!';
      ^1:hover {
        content: '!!!';
      }
    }
  }
}
