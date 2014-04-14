$foo = 42
div {
  b { ("3 > 2: " + (3 > 2)) }
  b { ($foo == 42? "twentyfour" : $foo) }
  b { (true && 42) }
  b { length([1,2,3]) }
  b { ({ foo: 23 }.foo) }
}
