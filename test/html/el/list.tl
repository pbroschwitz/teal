ul {
  @each $i in $items li {
    $i.label
    @if $i.items ./list { items=$i.items }
  }
}
