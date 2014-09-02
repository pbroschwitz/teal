var express = require('express')
  , teal = require('../../lib')

var app = express()
  , tl = teal()

tl.css.compress = false
app.use(tl)
app.listen(3000)

app.get('/', function(req, res) {
  res.render('hello')
})
