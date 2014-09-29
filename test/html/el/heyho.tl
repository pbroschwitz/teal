div {
  @if true {
    @if $hey ./p { $hey }
    @else "Ho"
    @if !$hey "ho"
  }
}
