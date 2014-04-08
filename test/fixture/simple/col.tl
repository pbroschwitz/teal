$c4 = !($cols%4)
$c3 = !($cols%3)
$c2 = !($c4 || $cols%2)
$c1 = !($c4 || $c3 || $c2)
div {
  float: left
  .c1 { width: 100% }
  .c2 { width: 50% }
  .c3 { width: 33.33% }
  .c4 { width: 25% }
}
