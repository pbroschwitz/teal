ul {
  @for $items li {
    $label
    @if($_.items) ./list { items=$_.items }
  }
}
