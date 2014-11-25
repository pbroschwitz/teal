div {
  items = {
    { label='foo' }
    { label='bar' items = {
      { label='baz' }
      { label= 'boo' }
    }}
  }
}
/*
div {
  items = [
    [ label='foo' ]
    [ label='bar' items=[
      [ label='baz' ]
      [ label= 'boo' ]
    ]]
  ]
}
*/
