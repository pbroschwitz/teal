$is-c4 = !($cols%4)
$is-c3 = !($cols%3)
$is-c2 = !($is-c4 || $cols%2)
$is-c1 = !($is-c4 || $is-c3 || $is-c2)
div {
  float: left
  is-c1 { width: 100% }
  is-c2 { width: 50% }
  is-c3 { width: 33.33% }
  is-c4 { width: 25% }
}
