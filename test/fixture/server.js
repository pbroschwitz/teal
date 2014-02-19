var express = require('express')
  , teal = require('../../lib')

var app = express()
app.use(teal())
app.listen(3000)

app.get('/', function(req, res) {
  res.render('hello')
})

app.get('/js', function(req, res) {
  res.render('browserify')
})