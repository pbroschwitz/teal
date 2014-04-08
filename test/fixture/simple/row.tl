$cols = length($content)
div {
  @for($content) ./col { cols=$cols $_ }
}
