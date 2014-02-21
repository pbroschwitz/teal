var request = require('supertest')
  , express = require('express')
  , teal = require('../lib')

var app = express()

app.set('views', __dirname + '/fixture')
app.use(teal())

describe('app', function() {

  it('should ...', function(done) {
    request(app)
      .get('/assets/main.css')
      .expect(200, done)
  })

})